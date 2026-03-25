import { crmDb } from '@/src/crm/core/crmDb';
import { ApiError } from '@/src/crm/core/api';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export class LeadScoringService {
  async calculateLeadScore(leadId: string): Promise<number> {
    const lead = await crmDb.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const [
      inboundReplies,
      clickEvents,
      bookingEvents,
      completedAppointments,
      proposalEvents,
    ] = await Promise.all([
      crmDb.conversationMessage.count({
        where: {
          direction: 'INBOUND',
          conversation: {
            leadId,
          },
        },
      }),
      crmDb.interaction.count({
        where: {
          leadId,
          type: 'link_clicked',
        },
      }),
      crmDb.interaction.count({
        where: {
          leadId,
          type: 'appointment_booked',
        },
      }),
      crmDb.appointment.count({
        where: {
          leadId,
          status: 'COMPLETED',
        },
      }),
      crmDb.interaction.count({
        where: {
          leadId,
          type: 'proposal_viewed',
        },
      }),
    ]);

    // Behavior-based weighted scoring model.
    let score = 10;
    score += Math.min(inboundReplies * 8, 32);
    score += Math.min(clickEvents * 6, 18);
    score += Math.min(bookingEvents * 12, 24);
    score += Math.min(completedAppointments * 10, 20);
    score += Math.min(proposalEvents * 8, 16);

    if (lead.email) score += 5;
    if (lead.phone) score += 5;

    return clamp(Math.round(score), 0, 100);
  }

  async updateLeadScore(leadId: string): Promise<number> {
    const score = await this.calculateLeadScore(leadId);

    await crmDb.lead.update({
      where: { id: leadId },
      data: {
        score,
      },
    });

    return score;
  }
}
