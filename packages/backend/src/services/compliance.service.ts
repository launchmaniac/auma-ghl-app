// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase.service.js';
import { notificationService, getMloContextForLoan } from './notification.service.js';
import { logger } from '../utils/logger.js';

// Local compliance result type (different from shared ComplianceCheckResult)
interface ComplianceResult {
  blocked: boolean;
  escalationReason: string | null;
  suggestedResponse: string | null;
  requiresHumanReview: boolean;
  flaggedKeywords: string[];
}

/**
 * SAFE Act Compliance Keywords
 * Based on "Conduit Theory" - AI must never provide rate or loan advice
 */
const RATE_KEYWORDS = [
  'rate',
  'rates',
  'apr',
  'interest',
  'interest rate',
  'payment',
  'monthly payment',
  'payments',
  'lock',
  'rate lock',
  'points',
  'discount points',
  'closing costs',
  'fees',
  'origination',
  'lender credit',
];

const ADVICE_KEYWORDS = [
  'should i',
  'should we',
  'recommend',
  'recommendation',
  'better',
  'best loan',
  'best option',
  'advice',
  'advise',
  'suggest',
  'suggestion',
  'which loan',
  'what loan',
  'what type',
  'which type',
  'compare',
  'comparison',
  'pros and cons',
  'benefits',
  'advantages',
  'disadvantages',
];

const PRODUCT_KEYWORDS = [
  'conventional',
  'fha',
  'va loan',
  'usda',
  'jumbo',
  'arm',
  'adjustable',
  'fixed rate',
  '30 year',
  '15 year',
  '30-year',
  '15-year',
  'refinance',
  'cash out',
  'cash-out',
  'heloc',
  'home equity',
];

/**
 * Safe topics that AI can discuss without escalation
 */
const SAFE_TOPICS = [
  'document status',
  'application status',
  'loan status',
  'upload document',
  'missing documents',
  'conditions',
  'timeline',
  'next steps',
  'contact information',
  'office hours',
  'appointment',
  'schedule',
];

/**
 * Escalation response templates
 */
const ESCALATION_RESPONSES: Record<string, string> = {
  SAFE_ACT_RATE_INQUIRY: `That's an excellent question about loan terms. Since this involves specific rate and payment information, I've notified your licensed Mortgage Loan Originator who will contact you within 2 hours to discuss your options in detail. They're the best person to explain how different rate scenarios would work for your specific situation.`,

  SAFE_ACT_ADVICE_REQUEST: `I appreciate you asking for my recommendation. Under federal regulations, only a licensed Mortgage Loan Originator can provide that type of guidance. I've notified your MLO, and they will reach out within 2 hours to help you evaluate your options.`,

  SAFE_ACT_PRODUCT_INQUIRY: `Great question about loan products! Your licensed Mortgage Loan Originator is the best resource for explaining how different loan programs might work for your situation. I've let them know you have questions, and they'll be in touch within 2 hours.`,

  SAFE_ACT_GENERIC: `This is an important question that requires input from your licensed Mortgage Loan Originator. I've notified them, and they will contact you shortly to provide the guidance you need.`,
};

interface ComplianceCheckContext {
  loanId: string;
  locationId: string;
  borrowerId?: string;
  borrowerName: string;
  source: 'portal' | 'chat' | 'email' | 'sms';
}

class ComplianceService {
  /**
   * Check message for SAFE Act compliance violations
   * Returns compliance result with escalation details if needed
   */
  async checkMessage(
    message: string,
    context: ComplianceCheckContext
  ): Promise<ComplianceResult> {
    const messageLower = message.toLowerCase();

    // First, check if this is a clearly safe topic
    const isSafeTopic = SAFE_TOPICS.some(topic =>
      messageLower.includes(topic.toLowerCase())
    );

    if (isSafeTopic && !this.containsViolation(messageLower)) {
      return {
        blocked: false,
        escalationReason: null,
        suggestedResponse: null,
        requiresHumanReview: false,
        flaggedKeywords: [],
      };
    }

    // Check for rate-related keywords
    const rateMatches = RATE_KEYWORDS.filter(k => messageLower.includes(k));
    if (rateMatches.length > 0) {
      await this.handleViolation(context, 'SAFE_ACT_RATE_INQUIRY', rateMatches, message);
      return {
        blocked: true,
        escalationReason: 'SAFE_ACT_RATE_INQUIRY',
        suggestedResponse: ESCALATION_RESPONSES.SAFE_ACT_RATE_INQUIRY,
        requiresHumanReview: true,
        flaggedKeywords: rateMatches,
      };
    }

    // Check for advice-seeking keywords
    const adviceMatches = ADVICE_KEYWORDS.filter(k => messageLower.includes(k));
    if (adviceMatches.length > 0) {
      await this.handleViolation(context, 'SAFE_ACT_ADVICE_REQUEST', adviceMatches, message);
      return {
        blocked: true,
        escalationReason: 'SAFE_ACT_ADVICE_REQUEST',
        suggestedResponse: ESCALATION_RESPONSES.SAFE_ACT_ADVICE_REQUEST,
        requiresHumanReview: true,
        flaggedKeywords: adviceMatches,
      };
    }

    // Check for product comparison keywords
    const productMatches = PRODUCT_KEYWORDS.filter(k => messageLower.includes(k));
    if (productMatches.length > 0) {
      // Product inquiries are only escalated if combined with comparison/advice intent
      const hasComparisonIntent = ['compare', 'vs', 'versus', 'or', 'difference', 'better']
        .some(k => messageLower.includes(k));

      if (hasComparisonIntent) {
        await this.handleViolation(context, 'SAFE_ACT_PRODUCT_INQUIRY', productMatches, message);
        return {
          blocked: true,
          escalationReason: 'SAFE_ACT_PRODUCT_INQUIRY',
          suggestedResponse: ESCALATION_RESPONSES.SAFE_ACT_PRODUCT_INQUIRY,
          requiresHumanReview: true,
          flaggedKeywords: productMatches,
        };
      }
    }

    // No violations detected
    return {
      blocked: false,
      escalationReason: null,
      suggestedResponse: null,
      requiresHumanReview: false,
      flaggedKeywords: [],
    };
  }

  /**
   * Check AI-generated response for SAFE Act violations
   * Ensures AI doesn't accidentally provide rate/advice information
   */
  async validateAiResponse(
    response: string,
    context: ComplianceCheckContext
  ): Promise<{ valid: boolean; violations: string[] }> {
    const responseLower = response.toLowerCase();
    const violations: string[] = [];

    // Check for specific rate/payment mentions (e.g., "3.5%", "$1,500/month")
    const ratePattern = /\d+\.?\d*\s*%/g;
    const paymentPattern = /\$\s*[\d,]+\s*\/?\s*(month|mo|monthly)?/gi;

    if (ratePattern.test(responseLower)) {
      violations.push('Contains specific rate percentage');
    }

    if (paymentPattern.test(responseLower) && responseLower.includes('payment')) {
      violations.push('Contains specific payment amount');
    }

    // Check for recommendation language
    const recommendationPhrases = [
      'i recommend',
      'you should',
      'the best option',
      'i suggest',
      'i advise',
      'my recommendation',
      'in my opinion',
      'i think you should',
    ];

    for (const phrase of recommendationPhrases) {
      if (responseLower.includes(phrase)) {
        violations.push(`Contains recommendation phrase: "${phrase}"`);
      }
    }

    if (violations.length > 0) {
      // Log the violation for review
      await supabase.from('compliance_violations').insert({
        id: uuidv4(),
        loan_id: context.loanId,
        location_id: context.locationId,
        violation_type: 'ai_response_violation',
        content: response,
        violations,
        created_at: new Date().toISOString(),
      });

      logger.warn('AI response failed compliance check', {
        loanId: context.loanId,
        violations,
      });
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /**
   * Generate a compliant response for common inquiries
   */
  getCompliantResponse(topic: string, context: { mloName?: string; mloPhone?: string }): string {
    const responses: Record<string, string> = {
      rate_inquiry: `For specific rate information, please contact ${context.mloName || 'your Mortgage Loan Originator'}${context.mloPhone ? ` at ${context.mloPhone}` : ''}. They can provide personalized rate quotes based on your specific situation.`,

      loan_comparison: `Comparing loan options is an important decision. ${context.mloName || 'Your MLO'} can walk you through the differences and help you understand which might work best for your needs. Would you like me to have them reach out to you?`,

      payment_inquiry: `Monthly payment amounts depend on several factors including your rate, loan term, and property taxes/insurance. ${context.mloName || 'Your MLO'} can provide a detailed breakdown. Shall I have them contact you?`,

      status_update: `I can help with that! Let me check your loan status and get you the latest information.`,

      document_help: `I'd be happy to help with your documents. You can upload them through the portal, and I'll make sure they get to the right place for review.`,

      timeline: `I can provide general timeline information. Typically, the mortgage process takes 30-45 days from application to closing, but your specific timeline depends on several factors. Would you like me to check where we are in your specific process?`,
    };

    return responses[topic] || responses.status_update;
  }

  /**
   * Create audit trail for compliance events
   */
  async logComplianceEvent(
    eventType: string,
    context: ComplianceCheckContext,
    details: Record<string, unknown>
  ): Promise<void> {
    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      loan_id: context.loanId,
      location_id: context.locationId,
      action_type: `compliance_${eventType}`,
      performed_by: 'ai_assistant',
      details: {
        ...details,
        source: context.source,
        borrowerId: context.borrowerId,
      },
    });
  }

  private containsViolation(message: string): boolean {
    return (
      RATE_KEYWORDS.some(k => message.includes(k)) ||
      ADVICE_KEYWORDS.some(k => message.includes(k))
    );
  }

  private async handleViolation(
    context: ComplianceCheckContext,
    violationType: string,
    flaggedKeywords: string[],
    originalMessage: string
  ): Promise<void> {
    // Create escalation record
    await supabase.from('escalations').insert({
      id: uuidv4(),
      loan_id: context.loanId,
      location_id: context.locationId,
      escalation_type: 'safe_act_violation',
      reason: violationType,
      details: {
        originalMessage,
        flaggedKeywords,
        source: context.source,
        borrowerName: context.borrowerName,
      },
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    // Log compliance event
    await this.logComplianceEvent('escalation', context, {
      violationType,
      flaggedKeywords,
    });

    // Notify MLO
    const mloContext = await getMloContextForLoan(context.loanId);
    if (mloContext) {
      await notificationService.sendSafeActEscalation(
        {
          loanId: context.loanId,
          loanNumber: '', // Would need to fetch
          locationId: context.locationId,
          borrowerName: context.borrowerName,
          ghlContactId: '', // Would need to fetch
        },
        mloContext,
        originalMessage,
        flaggedKeywords
      );
    }

    logger.info('SAFE Act violation escalated', {
      loanId: context.loanId,
      violationType,
      keywordCount: flaggedKeywords.length,
    });
  }

  /**
   * Get statistics for compliance dashboard
   */
  async getComplianceStats(
    locationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalEscalations: number;
    byType: Record<string, number>;
    avgResponseTime: number;
    resolvedPercentage: number;
  }> {
    const { data: escalations, error } = await supabase
      .from('escalations')
      .select('*')
      .eq('location_id', locationId)
      .eq('escalation_type', 'safe_act_violation')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error || !escalations) {
      return {
        totalEscalations: 0,
        byType: {},
        avgResponseTime: 0,
        resolvedPercentage: 0,
      };
    }

    // Count by type
    const byType: Record<string, number> = {};
    escalations.forEach(e => {
      const reason = e.reason || 'unknown';
      byType[reason] = (byType[reason] || 0) + 1;
    });

    // Calculate resolved percentage
    const resolved = escalations.filter(e => e.status === 'resolved').length;
    const resolvedPercentage = escalations.length > 0
      ? (resolved / escalations.length) * 100
      : 0;

    // Calculate average response time (for resolved items)
    const resolvedWithTime = escalations.filter(
      e => e.status === 'resolved' && e.resolved_at
    );
    const avgResponseTime = resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, e) => {
          const created = new Date(e.created_at).getTime();
          const resolved = new Date(e.resolved_at).getTime();
          return sum + (resolved - created);
        }, 0) / resolvedWithTime.length / (1000 * 60) // Convert to minutes
      : 0;

    return {
      totalEscalations: escalations.length,
      byType,
      avgResponseTime: Math.round(avgResponseTime),
      resolvedPercentage: Math.round(resolvedPercentage * 10) / 10,
    };
  }
}

export const complianceService = new ComplianceService();
