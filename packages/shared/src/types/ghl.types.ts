// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

export interface GhlInstallation {
  id: string;
  locationId: string;
  companyId?: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  expiresAt: Date;
  installedAt: Date;
  isActive: boolean;
}

export interface GhlTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  locationId: string;
  companyId?: string;
}

export interface GhlContact {
  id: string;
  locationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  tags?: string[];
  customFields?: Record<string, unknown>;
  dateAdded: string;
  dateUpdated: string;
}

export interface GhlOpportunity {
  id: string;
  name: string;
  monetaryValue?: number;
  pipelineId: string;
  pipelineStageId: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  contactId: string;
  locationId: string;
  assignedTo?: string;
  customFields?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GhlPipeline {
  id: string;
  name: string;
  locationId: string;
  stages: GhlPipelineStage[];
}

export interface GhlPipelineStage {
  id: string;
  name: string;
  position: number;
}

export interface GhlTask {
  id: string;
  title: string;
  body?: string;
  dueDate: string;
  completed: boolean;
  assignedTo?: string;
  contactId?: string;
}

export interface GhlTaskCreateInput {
  contactId: string;
  assignedTo?: string;
  title: string;
  description?: string;
  dueDate: Date;
}

export interface GhlMessage {
  id: string;
  type: 'SMS' | 'Email' | 'GMB' | 'IG' | 'FB' | 'WhatsApp';
  body: string;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  contactId: string;
  locationId: string;
  dateAdded: string;
}

export interface GhlOAuthCallbackParams {
  code: string;
  state?: string;
}

export interface GhlWebhookPayload {
  type: string;
  locationId: string;
  contactId?: string;
  opportunityId?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// AUMA-specific pipeline stage mapping
export const AUMA_PIPELINE_STAGES: Record<string, string> = {
  lead: 'Lead',
  initial_call: 'Initial Call',
  app_in: 'App In',
  post_app_call: 'Post-App Call',
  notes_to_lo: 'Notes to LO',
  pre_approval_prep: 'Pre-Approval Prep',
  in_contract: 'In Contract (PSA)',
  pipeline_mgmt: 'Pipeline Management',
  final_approval: 'Final Approval',
  post_closing: 'Post Closing',
  denied: 'Denied',
} as const;
