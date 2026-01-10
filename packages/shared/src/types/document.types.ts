// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

export type DocumentType =
  | 'paystub'
  | 'w2'
  | 'tax_return_1040'
  | 'tax_return_1120'
  | 'tax_return_1065'
  | 'schedule_c'
  | 'schedule_e'
  | 'k1'
  | 'bank_statement'
  | 'investment_statement'
  | 'retirement_statement'
  | 'drivers_license'
  | 'passport'
  | 'social_security_card'
  | 'purchase_agreement'
  | 'appraisal'
  | 'title_commitment'
  | 'homeowners_insurance'
  | 'survey'
  | 'other';

export type DocumentCategory = 'income' | 'asset' | 'identity' | 'property' | 'legal' | 'other';

export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ValidationStatus = 'pending' | 'valid' | 'invalid' | 'needs_review';

export interface Document {
  id: string;
  loanId: string;
  borrowerId?: string;
  documentType: DocumentType;
  documentCategory: DocumentCategory;

  // File Storage
  originalFileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  checksum: string;

  // OCR Processing
  ocrStatus: OcrStatus;
  ocrConfidenceScore?: number;
  ocrData?: OcrExtractedData;
  ocrRawText?: string;

  // Validation
  validationStatus: ValidationStatus;
  validationErrors?: ValidationError[];

  // Metadata
  uploadedBy: string;
  uploadSource: 'borrower_portal' | 'processor_upload' | 'email_integration';
  createdAt: Date;
}

export interface OcrExtractedData {
  documentType: DocumentType;
  extractedFields: Record<string, unknown>;
  confidence: number;
}

export interface PaystubOcrData extends OcrExtractedData {
  documentType: 'paystub';
  extractedFields: {
    employerName: string;
    employeeeName: string;
    payPeriodStart: string;
    payPeriodEnd: string;
    payDate: string;
    payFrequency: 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly';
    grossPay: number;
    netPay: number;
    ytdGross: number;
    ytdNet: number;
    hourlyRate?: number;
    hoursWorked?: number;
    regularEarnings: number;
    overtimeEarnings?: number;
    bonusEarnings?: number;
    commissionEarnings?: number;
    deductions: {
      name: string;
      amount: number;
      ytd: number;
    }[];
  };
}

export interface W2OcrData extends OcrExtractedData {
  documentType: 'w2';
  extractedFields: {
    taxYear: number;
    employerEin: string;
    employerName: string;
    employerAddress: string;
    employeeSsn: string;
    employeeName: string;
    employeeAddress: string;
    wagesTipsOther: number;
    federalIncomeTaxWithheld: number;
    socialSecurityWages: number;
    socialSecurityTaxWithheld: number;
    medicareWages: number;
    medicareTaxWithheld: number;
    stateTaxWithheld?: number;
    stateWages?: number;
    localTaxWithheld?: number;
    localWages?: number;
  };
}

export interface BankStatementOcrData extends OcrExtractedData {
  documentType: 'bank_statement';
  extractedFields: {
    bankName: string;
    accountNumber: string;
    accountType: 'checking' | 'savings' | 'money_market';
    accountHolderName: string;
    statementPeriodStart: string;
    statementPeriodEnd: string;
    beginningBalance: number;
    endingBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    deposits: {
      date: string;
      description: string;
      amount: number;
      isPayroll: boolean;
    }[];
    largeDeposits: {
      date: string;
      description: string;
      amount: number;
      requiresExplanation: boolean;
    }[];
    nsfCount: number;
    overdraftCount: number;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface DocumentUploadInput {
  loanId: string;
  borrowerId?: string;
  documentType: DocumentType;
  file: Blob | ArrayBuffer | Uint8Array;
  fileName: string;
  uploadSource: 'borrower_portal' | 'processor_upload' | 'email_integration';
}
