// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

export interface PortalSession {
  id: string;
  borrowerId: string;
  loanId: string;
  locationId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastAccessedAt: Date;
}

export interface PortalMagicLinkInput {
  borrowerEmail: string;
  borrowerPhone?: string;
  loanId: string;
  locationId: string;
  expiresInHours?: number;
}

export interface PortalMagicLinkResult {
  success: boolean;
  sentVia: 'email' | 'sms' | 'both';
  portalUrl: string;
  expiresAt: Date;
}

export interface PortalLoanProgress {
  currentStage: string;
  stageNumber: number;
  totalStages: number;
  completedStages: {
    name: string;
    completedAt: Date;
  }[];
  pendingConditions: PortalCondition[];
  nextSteps: string[];
  estimatedCloseDate?: Date;
}

export interface PortalCondition {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'received' | 'approved' | 'rejected';
  dueDate?: Date;
  documentType?: string;
  uploadedDocumentId?: string;
}

export interface PortalBorrowerProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  propertyAddress: string;
  loanNumber: string;
  assignedMlo: {
    name: string;
    email: string;
    phone: string;
    nmlsNumber: string;
  };
}

export interface PortalMessage {
  id: string;
  content: string;
  sender: 'borrower' | 'system' | 'mlo';
  senderName?: string;
  createdAt: Date;
  isEscalation: boolean;
}

export interface PortalMessageInput {
  content: string;
  loanId: string;
  borrowerId: string;
}

export interface PortalDocumentUpload {
  id: string;
  fileName: string;
  documentType: string;
  status: 'uploading' | 'processing' | 'complete' | 'failed';
  uploadProgress: number;
  ocrStatus?: string;
  uploadedAt: Date;
}
