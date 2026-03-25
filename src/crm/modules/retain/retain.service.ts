import {
  ChannelType,
  ConversationDirection,
  LoyaltyEventType,
  ReviewStatus,
  SocialPostStatus,
} from '@/generated/crm-client';
import { ApiError } from '@/src/crm/core/api';
import { crmDb } from '@/src/crm/core/crmDb';
import { callOpenAiChat } from '@/src/crm/core/openai';
import { publishRealtimeEvent } from '@/src/crm/core/realtime';
import { toPrismaJson } from '@/src/crm/core/json';
import type {
  AwardLoyaltyInput,
  CreateReferralLinkInput,
  CreateReferralProgramInput,
  CreateReviewInput,
  RequestReviewInput,
} from './retain.types';

const POSITIVE_WORDS = ['great', 'excellent', 'amazing', 'fast', 'friendly', 'helpful', 'perfect', 'love'];
const NEGATIVE_WORDS = ['bad', 'slow', 'late', 'poor', 'unhappy', 'terrible', 'frustrated', 'worst'];

function scoreSentiment(text?: string): number {
  if (!text || text.trim().length === 0) return 0;
  const words = text.toLowerCase().split(/\W+/g);

  let score = 0;
  for (const word of words) {
    if (POSITIVE_WORDS.includes(word)) score += 1;
    if (NEGATIVE_WORDS.includes(word)) score -= 1;
  }

  return Math.max(-1, Math.min(1, score / 5));
}

function makeReferralCode(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export class RetainService {
  async listReviews(limit = 100) {
    return crmDb.review.findMany({
      take: Math.max(1, Math.min(limit, 300)),
      orderBy: { createdAt: 'desc' },
      include: {
        lead: true,
      },
    });
  }

  async listReferralPrograms(limit = 50) {
    return crmDb.referralProgram.findMany({
      take: Math.max(1, Math.min(limit, 200)),
      orderBy: { createdAt: 'desc' },
    });
  }

  async listReferralLinks(limit = 100, leadId?: string) {
    return crmDb.referralLink.findMany({
      where: leadId ? { leadId } : undefined,
      take: Math.max(1, Math.min(limit, 300)),
      orderBy: { createdAt: 'desc' },
      include: {
        program: true,
      },
    });
  }

  async getLoyaltyAccountByLeadId(leadId: string) {
    const account = await crmDb.loyaltyAccount.findUnique({
      where: { leadId },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!account) {
      throw new ApiError(404, 'Loyalty account not found for lead', 'LOYALTY_ACCOUNT_NOT_FOUND');
    }

    return account;
  }

  async requestReview(input: RequestReviewInput) {
    const lead = await crmDb.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const reviewRequest = await crmDb.reviewRequest.create({
      data: {
        leadId: input.leadId,
        channel: input.channel,
        status: ReviewStatus.REQUESTED,
      },
    });

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
        source: 'review-automation',
      },
    });

    const reviewMessage =
      typeof input.message === 'string' && input.message.trim().length > 0
        ? input.message.trim().slice(0, 500)
        : 'Thanks for your business. Could you share a quick review about your experience?';

    await crmDb.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        direction: ConversationDirection.OUTBOUND,
        channel: input.channel,
        content: reviewMessage,
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId: input.leadId,
        type: 'review_request_sent',
        channel: input.channel,
        payload: {
          reviewRequestId: reviewRequest.id,
        },
      },
    });

    await publishRealtimeEvent(`lead-${input.leadId}`, 'review.requested', {
      reviewRequestId: reviewRequest.id,
    });

    return reviewRequest;
  }

  async createReview(input: CreateReviewInput) {
    if (input.rating < 1 || input.rating > 5) {
      throw new ApiError(400, 'Rating must be between 1 and 5', 'INVALID_RATING');
    }

    const lead = await crmDb.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const sentimentScore = scoreSentiment(input.comment);

    const review = await crmDb.review.create({
      data: {
        leadId: input.leadId,
        source: input.source,
        rating: input.rating,
        comment: input.comment,
        sentimentScore,
        status: ReviewStatus.RECEIVED,
      },
    });

    await crmDb.reviewRequest.updateMany({
      where: {
        leadId: input.leadId,
        status: ReviewStatus.REQUESTED,
      },
      data: {
        status: ReviewStatus.RECEIVED,
        reviewedAt: new Date(),
      },
    });

    await crmDb.interaction.create({
      data: {
        leadId: input.leadId,
        type: 'review_received',
        payload: {
          reviewId: review.id,
          sentimentScore,
        },
      },
    });

    return review;
  }

  async generateReviewReply(reviewId: string) {
    const review = await crmDb.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new ApiError(404, 'Review not found', 'REVIEW_NOT_FOUND');
    }

    const prompt = [
      { role: 'user' as const, content: `Draft a short public reply for this review. Rating: ${review.rating}/5. Comment: ${review.comment || 'No comment.'}` },
    ];

    const aiReply = await callOpenAiChat(prompt, 'friendly');

    const updated = await crmDb.review.update({
      where: { id: reviewId },
      data: {
        aiReply,
        status: ReviewStatus.REPLIED,
      },
    });

    return updated;
  }

  async createReferralProgram(input: CreateReferralProgramInput) {
    return crmDb.referralProgram.create({
      data: {
        name: input.name,
        rewardCents: input.rewardCents,
        active: true,
      },
    });
  }

  async createReferralLink(input: CreateReferralLinkInput) {
    const lead = await crmDb.lead.findUnique({ where: { id: input.leadId } });
    if (!lead) {
      throw new ApiError(404, 'Lead not found', 'LEAD_NOT_FOUND');
    }

    const program = await crmDb.referralProgram.findUnique({ where: { id: input.programId } });
    if (!program || !program.active) {
      throw new ApiError(404, 'Referral program not found or inactive', 'REFERRAL_PROGRAM_NOT_FOUND');
    }

    const code = `${makeReferralCode()}${Date.now().toString().slice(-4)}`;

    return crmDb.referralLink.create({
      data: {
        leadId: input.leadId,
        programId: input.programId,
        code,
      },
    });
  }

  async trackReferralClick(code: string) {
    const link = await crmDb.referralLink.findUnique({ where: { code } });
    if (!link) {
      throw new ApiError(404, 'Referral link not found', 'REFERRAL_LINK_NOT_FOUND');
    }

    const updated = await crmDb.referralLink.update({
      where: { id: link.id },
      data: {
        clicks: {
          increment: 1,
        },
      },
    });

    await crmDb.referralEvent.create({
      data: {
        referralLinkId: link.id,
        eventType: 'click',
      },
    });

    return updated;
  }

  async trackReferralConversion(code: string, valueCents?: number) {
    const link = await crmDb.referralLink.findUnique({
      where: { code },
      include: {
        program: true,
      },
    });

    if (!link) {
      throw new ApiError(404, 'Referral link not found', 'REFERRAL_LINK_NOT_FOUND');
    }

    const updated = await crmDb.referralLink.update({
      where: { id: link.id },
      data: {
        conversions: {
          increment: 1,
        },
      },
    });

    await crmDb.referralEvent.create({
      data: {
        referralLinkId: link.id,
        eventType: 'conversion',
        valueCents,
      },
    });

    await this.awardLoyaltyPoints({
      leadId: link.leadId,
      type: LoyaltyEventType.BONUS,
      points: Math.floor((link.program.rewardCents || 0) / 100),
      metadata: {
        referralCode: code,
        rewardCents: link.program.rewardCents,
      },
    });

    return updated;
  }

  async awardLoyaltyPoints(input: AwardLoyaltyInput) {
    const account = await crmDb.loyaltyAccount.upsert({
      where: {
        leadId: input.leadId,
      },
      update: {
        points: {
          increment: input.points,
        },
      },
      create: {
        leadId: input.leadId,
        points: input.points,
      },
    });

    await crmDb.loyaltyEvent.create({
      data: {
        accountId: account.id,
        type: input.type,
        points: input.points,
        metadata: toPrismaJson(input.metadata),
      },
    });

    return crmDb.loyaltyAccount.findUnique({
      where: { id: account.id },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    });
  }

  async queueSocialPostFromReview(reviewId: string) {
    const review = await crmDb.review.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new ApiError(404, 'Review not found', 'REVIEW_NOT_FOUND');
    }

    // Push positive reviews to social queue.
    if (review.rating < 4 || review.sentimentScore <= 0) {
      return {
        queued: false,
        reason: 'Review score below social posting threshold',
      };
    }

    const post = await crmDb.socialPost.create({
      data: {
        reviewId,
        channel: 'linkedin',
        content: `Customer highlight: ${review.comment || 'Great feedback from a happy client.'}`,
        status: SocialPostStatus.QUEUED,
        scheduledAt: new Date(Date.now() + 5 * 60_000),
      },
    });

    return {
      queued: true,
      post,
    };
  }

  async runFollowupCron() {
    const staleRequests = await crmDb.reviewRequest.findMany({
      where: {
        status: ReviewStatus.REQUESTED,
        requestedAt: {
          lt: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
      },
      take: 200,
    });

    let remindersSent = 0;
    for (const request of staleRequests) {
      const channel = request.channel || ChannelType.SMS;
      const conversation = await crmDb.conversation.findFirst({
        where: {
          leadId: request.leadId,
          channel,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }) || await crmDb.conversation.create({
        data: {
          leadId: request.leadId,
          channel,
          source: 'retain-cron',
        },
      });

      await crmDb.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          direction: ConversationDirection.OUTBOUND,
          channel,
          content: 'Quick reminder: if you have a moment, we would really appreciate your feedback.',
        },
      });

      remindersSent += 1;
    }

    const queuedSocial = await crmDb.socialPost.findMany({
      where: {
        status: SocialPostStatus.QUEUED,
        scheduledAt: {
          lte: new Date(),
        },
      },
      take: 200,
    });

    let socialPublished = 0;
    for (const post of queuedSocial) {
      await crmDb.socialPost.update({
        where: { id: post.id },
        data: {
          status: SocialPostStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
      socialPublished += 1;
    }

    return {
      remindersSent,
      socialPublished,
      scannedReviewRequests: staleRequests.length,
      scannedQueuedPosts: queuedSocial.length,
    };
  }
}
