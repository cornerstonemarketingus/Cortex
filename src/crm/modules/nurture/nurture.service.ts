import {
  AppointmentStatus,
  ChannelType,
  ConversationDirection,
  PipelineStageType,
  WorkflowExecutionStatus,
  type Workflow,
} from '@/generated/crm-client';
import { ApiError } from '@/src/crm/core/api';
import { callOpenAiChat } from '@/src/crm/core/openai';
import { crmDb } from '@/src/crm/core/crmDb';
import { enqueueReminder } from '@/src/crm/core/queue';
import { publishRealtimeEvent } from '@/src/crm/core/realtime';
import { toPrismaJson, toPrismaRequiredJson } from '@/src/crm/core/json';
import type {
  AppointmentInput,
  SendMessageInput,
  TriggerWorkflowInput,
  WorkflowAction,
  WorkflowDefinition,
} from './nurture.types';
import { DeliveryAdapterService } from './delivery.adapters';
import { WorkflowEngine } from './workflow.engine';

export class NurtureService {
  private readonly workflowEngine = new WorkflowEngine();
  private readonly deliveryAdapters = new DeliveryAdapterService();

  async getUnifiedInbox(limit = 50) {
    const conversations = await crmDb.conversation.findMany({
      take: Math.max(1, Math.min(limit, 200)),
      orderBy: { updatedAt: 'desc' },
      include: {
        lead: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    return conversations.map((conversation) => ({
      ...conversation,
      latestMessage: conversation.messages[0] || null,
      unreadCount: conversation.messages.filter((message) => message.direction === ConversationDirection.INBOUND).length,
    }));
  }

  async sendMessage(input: SendMessageInput) {
    const lead = await crmDb.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const conversation = await crmDb.conversation.findFirst({
      where: {
        leadId: input.leadId,
        channel: input.channel,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    }) || await crmDb.conversation.create({
      data: {
        leadId: input.leadId,
        channel: input.channel,
        source: input.source || 'manual',
      },
    });

    const outbound = await crmDb.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        direction: ConversationDirection.OUTBOUND,
        channel: input.channel,
        content: input.content,
      },
    });

    const delivery = await this.deliveryAdapters.dispatchWithRetry({
      leadId: lead.id,
      leadFirstName: lead.firstName,
      leadLastName: lead.lastName,
      leadPhone: lead.phone,
      leadEmail: lead.email,
      channel: input.channel,
      content: input.content,
      source: input.source,
      subject: input.subject,
      messageId: outbound.id,
      conversationId: conversation.id,
    });

    const outboundWithDelivery = await crmDb.conversationMessage.update({
      where: {
        id: outbound.id,
      },
      data: {
        metadata: toPrismaJson({
          source: input.source || 'manual',
          delivery,
        }),
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId: input.leadId,
        type: 'outbound_message',
        channel: input.channel,
        payload: {
          conversationId: conversation.id,
          messageId: outbound.id,
          delivery,
        },
      },
    });

    await publishRealtimeEvent(`lead-${input.leadId}`, 'message.sent', {
      conversationId: conversation.id,
      message: outboundWithDelivery,
      delivery,
    });

    let autoReply = null;
    if (input.autoReply) {
      autoReply = await this.generateAutoReply(conversation.id, input.tone || 'friendly');
    }

    return {
      conversation,
      outbound: outboundWithDelivery,
      delivery,
      autoReply,
    };
  }

  async generateAutoReply(
    conversationId: string,
    tone: 'friendly' | 'sales' | 'support' = 'friendly'
  ) {
    const conversation = await crmDb.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 30,
        },
      },
    });

    if (!conversation) {
      throw new ApiError(404, 'Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const aiMessages = conversation.messages.map((message) => ({
      role: message.direction === ConversationDirection.INBOUND ? 'user' as const : 'assistant' as const,
      content: message.content,
    }));

    const aiText = await callOpenAiChat(aiMessages, tone);

    const reply = await crmDb.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        direction: ConversationDirection.OUTBOUND,
        channel: conversation.channel,
        content: aiText,
        aiGenerated: true,
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId: conversation.leadId,
        type: 'ai_auto_reply',
        channel: conversation.channel,
        payload: {
          conversationId: conversation.id,
          messageId: reply.id,
          tone,
        },
      },
    });

    await publishRealtimeEvent(`lead-${conversation.leadId}`, 'message.auto_reply', {
      conversationId: conversation.id,
      message: reply,
    });

    return reply;
  }

  async createWorkflow(name: string, definition: WorkflowDefinition) {
    return crmDb.workflow.create({
      data: {
        name,
        triggerType: definition.trigger,
        definitionJson: toPrismaRequiredJson(definition),
        isActive: true,
      },
    });
  }

  async listWorkflows() {
    return crmDb.workflow.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async executeWorkflowAction(
    action: WorkflowAction,
    leadId: string,
    context: Record<string, unknown>
  ) {
    switch (action.type) {
      case 'send_sms':
      case 'send_email':
      case 'send_chat': {
        const channel = action.type === 'send_sms'
          ? ChannelType.SMS
          : action.type === 'send_email'
          ? ChannelType.EMAIL
          : ChannelType.CHAT;
        const template = String(action.payload.message || '');
        const message = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
          const replacement = context[key];
          return replacement === undefined || replacement === null ? '' : String(replacement);
        });

        await this.sendMessage({
          leadId,
          channel,
          content: message,
          source: 'workflow',
          autoReply: false,
        });
        return { ok: true, action: action.type };
      }
      case 'set_pipeline_stage': {
        const stageTypeRaw = String(action.payload.stage || 'NEW').toUpperCase();
        const stageType = (
          Object.values(PipelineStageType).includes(stageTypeRaw as PipelineStageType)
            ? (stageTypeRaw as PipelineStageType)
            : PipelineStageType.NEW
        );

        await crmDb.lead.update({
          where: { id: leadId },
          data: {
            stage: stageType,
          },
        });

        return { ok: true, action: action.type, stageType };
      }
      case 'enqueue_reminder': {
        const minutes = Number(action.payload.inMinutes || 10);
        const channelRaw = String(action.payload.channel || 'SMS').toUpperCase();
        const channel: 'SMS' | 'EMAIL' | 'CHAT' =
          channelRaw === 'EMAIL' || channelRaw === 'CHAT' ? channelRaw : 'SMS';
        const payload = {
          message: action.payload.message || 'Reminder follow-up',
        };

        const reminder = await crmDb.reminder.create({
          data: {
            leadId,
            channel,
            sendAt: new Date(Date.now() + Math.max(1, minutes) * 60_000),
            payload,
          },
        });

        await enqueueReminder(
          {
            reminderId: reminder.id,
            leadId,
            channel,
            payload: payload as Record<string, unknown>,
          },
          {
            delay: Math.max(1, minutes) * 60_000,
          }
        );

        return { ok: true, action: action.type, reminderId: reminder.id };
      }
      case 'assign_owner':
      case 'create_note': {
        await crmDb.interaction.create({
          data: {
            leadId,
            type: action.type,
            payload: toPrismaJson(action.payload),
          },
        });
        return { ok: true, action: action.type };
      }
      default:
        return { ok: false, action: action.type, reason: 'Unsupported action type' };
    }
  }

  async triggerWorkflows(input: TriggerWorkflowInput) {
    const workflows = await crmDb.workflow.findMany({
      where: {
        triggerType: input.triggerType,
        isActive: true,
      },
    });

    const results: Array<Record<string, unknown>> = [];

    for (const workflow of workflows) {
      const definition = workflow.definitionJson as unknown as WorkflowDefinition;
      const execution = await crmDb.workflowExecution.create({
        data: {
          workflowId: workflow.id,
          leadId: input.leadId,
          triggerType: input.triggerType,
          contextJson: toPrismaRequiredJson(input.context),
          status: WorkflowExecutionStatus.RUNNING,
        },
      });

      try {
        const matches = this.workflowEngine.evaluate(definition, input.context);
        if (!matches) {
          await crmDb.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: WorkflowExecutionStatus.COMPLETED,
              logsJson: toPrismaJson({
                skipped: true,
                reason: 'conditions_not_met',
              }),
            },
          });
          results.push({ workflowId: workflow.id, skipped: true });
          continue;
        }

        const actionLogs: Array<Record<string, unknown>> = [];
        if (!input.leadId) {
          throw new ApiError(400, 'leadId is required when executing workflow actions', 'WORKFLOW_LEAD_REQUIRED');
        }

        for (const action of this.workflowEngine.resolveActions(definition)) {
          const actionResult = await this.executeWorkflowAction(action, input.leadId, input.context);
          actionLogs.push(actionResult);
        }

        await crmDb.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: WorkflowExecutionStatus.COMPLETED,
            logsJson: toPrismaJson({
              actions: actionLogs,
            }),
          },
        });

        results.push({ workflowId: workflow.id, executed: true, actions: actionLogs });
      } catch (error) {
        await crmDb.workflowExecution.update({
          where: { id: execution.id },
          data: {
            status: WorkflowExecutionStatus.FAILED,
            logsJson: toPrismaJson({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        });

        results.push({
          workflowId: workflow.id,
          executed: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      triggerType: input.triggerType,
      workflowCount: workflows.length,
      results,
    };
  }

  async createAppointment(input: AppointmentInput) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw new ApiError(400, 'startsAt and endsAt must be valid ISO date values', 'INVALID_APPOINTMENT_TIME');
    }

    if (endsAt <= startsAt) {
      throw new ApiError(400, 'endsAt must be after startsAt', 'INVALID_APPOINTMENT_WINDOW');
    }

    return crmDb.appointment.create({
      data: {
        leadId: input.leadId,
        startsAt,
        endsAt,
        location: input.location,
        notes: input.notes,
        status: AppointmentStatus.SCHEDULED,
      },
    });
  }

  async listAppointments(limit = 100) {
    return crmDb.appointment.findMany({
      take: Math.max(1, Math.min(limit, 300)),
      orderBy: {
        startsAt: 'asc',
      },
      include: {
        lead: true,
      },
    });
  }

  async listPipeline() {
    const leads = await crmDb.lead.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        pipelineCards: {
          include: {
            stage: true,
          },
        },
      },
    });

    return leads.map((lead) => ({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      stage: lead.stage,
      score: lead.score,
      cards: lead.pipelineCards,
    }));
  }

  async processReminder(reminderId: string) {
    const reminder = await crmDb.reminder.findUnique({
      where: {
        id: reminderId,
      },
    });

    if (!reminder) {
      throw new ApiError(404, 'Reminder not found', 'REMINDER_NOT_FOUND');
    }

    if (reminder.sentAt) {
      return {
        status: 'already_sent',
        reminder,
      };
    }

    const payload = reminder.payload as { message?: string } | null;
    const message = payload?.message || 'Reminder follow-up';

    await this.sendMessage({
      leadId: reminder.leadId,
      channel: reminder.channel,
      content: message,
      source: 'reminder-engine',
      autoReply: false,
    });

    const updated = await crmDb.reminder.update({
      where: { id: reminder.id },
      data: {
        sentAt: new Date(),
      },
    });

    return {
      status: 'sent',
      reminder: updated,
    };
  }

  async seedMissedCallAutomation(messageTemplate?: string): Promise<Workflow> {
    const missedCallMessage =
      typeof messageTemplate === 'string' && messageTemplate.trim().length > 0
        ? messageTemplate.trim().slice(0, 500)
        : 'Sorry we missed your call. Want to book a quick callback?';

    const definition: WorkflowDefinition = {
      trigger: 'missed_call',
      conditions: [
        {
          field: 'isNewLead',
          operator: 'eq',
          value: true,
        },
      ],
      actions: [
        {
          type: 'send_sms',
          payload: {
            message: missedCallMessage,
          },
        },
        {
          type: 'set_pipeline_stage',
          payload: {
            stage: 'CONTACTED',
          },
        },
      ],
    };

    const existing = await crmDb.workflow.findFirst({
      where: {
        name: 'Missed Call Auto Text',
      },
    });

    if (existing) {
      return crmDb.workflow.update({
        where: { id: existing.id },
        data: {
          triggerType: definition.trigger,
          definitionJson: toPrismaRequiredJson(definition),
          isActive: true,
        },
      });
    }

    return this.createWorkflow('Missed Call Auto Text', definition);
  }

  private async upsertWorkflowByName(name: string, definition: WorkflowDefinition): Promise<Workflow> {
    const existing = await crmDb.workflow.findFirst({
      where: {
        name,
      },
    });

    if (existing) {
      return crmDb.workflow.update({
        where: { id: existing.id },
        data: {
          triggerType: definition.trigger,
          definitionJson: toPrismaRequiredJson(definition),
          isActive: true,
        },
      });
    }

    return this.createWorkflow(name, definition);
  }

  async seedCoreAutomationPack(templates?: {
    missedCallTextBack?: string;
    stageFollowup?: string;
  }) {
    const stageFollowupMessage =
      typeof templates?.stageFollowup === 'string' && templates.stageFollowup.trim().length > 0
        ? templates.stageFollowup.trim().slice(0, 500)
        : 'Quick check-in: want to keep your project moving this week?';

    const instantLeadReplyDefinition: WorkflowDefinition = {
      trigger: 'lead_created',
      conditions: [
        {
          field: 'isNewLead',
          operator: 'eq',
          value: true,
        },
      ],
      actions: [
        {
          type: 'send_sms',
          payload: {
            message:
              'Thanks for reaching out. We got your request and will text a detailed next step shortly.',
          },
        },
        {
          type: 'set_pipeline_stage',
          payload: {
            stage: 'CONTACTED',
          },
        },
        {
          type: 'assign_owner',
          payload: {
            owner: 'automation-queue',
            task: 'Call lead within 10 minutes',
            priority: 'high',
          },
        },
      ],
    };

    const stageFollowupDefinition: WorkflowDefinition = {
      trigger: 'stage_changed',
      conditions: [
        {
          field: 'newStage',
          operator: 'in',
          value: ['CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT'],
        },
      ],
      actions: [
        {
          type: 'enqueue_reminder',
          payload: {
            inMinutes: 1440,
            channel: 'SMS',
            message: stageFollowupMessage,
          },
        },
        {
          type: 'create_note',
          payload: {
            note: 'Automated follow-up sequence scheduled for current pipeline stage.',
          },
        },
      ],
    };

    const [missedCall, instantLeadReply, stageFollowup] = await Promise.all([
      this.seedMissedCallAutomation(templates?.missedCallTextBack),
      this.upsertWorkflowByName('Instant Lead Response', instantLeadReplyDefinition),
      this.upsertWorkflowByName('Stage Follow-Up Sequence', stageFollowupDefinition),
    ]);

    return {
      missedCall,
      instantLeadReply,
      stageFollowup,
    };
  }
}
