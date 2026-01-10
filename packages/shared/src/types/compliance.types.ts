// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

export type EscalationReason =
  | 'SAFE_ACT_RATE_NEGOTIATION'
  | 'SAFE_ACT_COUNSELING'
  | 'SAFE_ACT_FINANCIAL_ADVICE'
  | 'SAFE_ACT_LOAN_COMPARISON'
  | 'MANUAL_ESCALATION';

export type EscalationStatus = 'pending' | 'acknowledged' | 'resolved';

export interface Escalation {
  id: string;
  loanId: string;
  locationId: string;
  borrowerId?: string;
  reason: EscalationReason;
  status: EscalationStatus;

  // Context
  triggerMessage: string;
  triggerKeywords: string[];
  aiConfidenceScore: number;

  // Response
  autoResponse: string;
  mloResponse?: string;

  // Assignment
  assignedMloId: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;

  // Audit
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceCheckResult {
  blocked: boolean;
  proceed: boolean;
  escalationReason?: EscalationReason;
  response?: string;
  auditLog: AuditLogEntry;
}

export interface AuditLogEntry {
  id?: string;
  loanId?: string;
  locationId: string;
  userId?: string;
  actionType: AuditActionType;
  performedBy: 'ai_assistant' | 'human_processor' | 'mlo' | 'automated_system';
  aiConfidence?: number;
  complianceRuleApplied?: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export type AuditActionType =
  | 'loan_created'
  | 'loan_status_changed'
  | 'document_uploaded'
  | 'document_processed'
  | 'income_calculated'
  | 'escalation_triggered'
  | 'escalation_resolved'
  | 'message_sent'
  | 'message_blocked'
  | 'mlo_notified'
  | 'disclosure_sent'
  | 'portal_accessed';

// SAFE Act keyword lists for compliance checking
export const RATE_KEYWORDS = [
  'rate',
  'interest',
  'apr',
  'payment',
  'monthly payment',
  'lock',
  'rate lock',
  'how much will i pay',
  'what will my rate be',
  'points',
  'discount points',
] as const;

export const ADVICE_KEYWORDS = [
  'should i',
  'recommend',
  'advice',
  'better option',
  'best loan',
  'which loan',
  'compare',
  'comparison',
  'what do you think',
  'is it worth',
] as const;

export const ESCALATION_RESPONSES: Record<EscalationReason, string> = {
  SAFE_ACT_RATE_NEGOTIATION:
    "That's an important question about your loan terms. To ensure you receive the most accurate advice and to comply with licensing regulations, I've flagged this message for your licensed loan officer. They will contact you within 2 hours to discuss rates, payments, and loan options.",
  SAFE_ACT_COUNSELING:
    "I appreciate your question. To provide you with proper guidance on this matter, I need to connect you with your licensed loan officer who can offer personalized advice. They will reach out to you shortly.",
  SAFE_ACT_FINANCIAL_ADVICE:
    "That's a great question that requires professional financial guidance. Your licensed loan officer is the right person to help you with this decision. They will be in touch within 2 hours.",
  SAFE_ACT_LOAN_COMPARISON:
    "Comparing loan options is an important decision. To give you accurate information about different loan programs, I've notified your licensed loan officer who will contact you to discuss your options.",
  MANUAL_ESCALATION:
    "I've escalated your request to your loan officer for personal attention. They will reach out to you shortly.",
} as const;
