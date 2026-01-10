// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

export type LoanStatus =
  | 'lead'
  | 'initial_call'
  | 'app_in'
  | 'post_app_call'
  | 'notes_to_lo'
  | 'pre_approval_prep'
  | 'in_contract'
  | 'pipeline_mgmt'
  | 'final_approval'
  | 'post_closing'
  | 'denied'
  | 'cancelled';

export type LoanPurpose = 'purchase' | 'rate_term_refi' | 'cash_out_refi' | 'construction';

export type LoanType = 'conventional' | 'fha' | 'va' | 'usda' | 'jumbo';

export type OccupancyType = 'primary' | 'second_home' | 'investment';

export type PropertyType =
  | 'single_family'
  | 'condo'
  | 'townhome'
  | 'manufactured'
  | 'multi_unit_2'
  | 'multi_unit_3'
  | 'multi_unit_4';

export interface Loan {
  id: string;
  locationId: string;
  ghlContactId: string;
  ghlOpportunityId?: string;
  loanNumber: string;
  status: LoanStatus;
  loanPurpose: LoanPurpose;
  loanType: LoanType;
  occupancyType: OccupancyType;

  // Property Details
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyCounty?: string;
  propertyType: PropertyType;

  // Financial Terms
  purchasePrice?: number;
  baseLoanAmount?: number;
  totalLoanAmount?: number;
  interestRate?: number;
  rateLockDate?: Date;
  lockExpirationDate?: Date;
  points?: number;

  // Ratios
  ltv?: number;
  cltv?: number;
  dtiFront?: number;
  dtiBack?: number;

  // Key Dates
  psaDate?: Date;
  closingDate?: Date;
  appSubmissionDate?: Date;
  initialDisclosureDate?: Date;
  cdIssueDate?: Date;

  // Tracking
  assignedProcessorId?: string;
  assignedMloId?: string;
  referralSource?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  // Optional relations (populated when loaded with joins)
  borrowers?: Borrower[];
  estimatedCloseDate?: Date;
  incomeCalculations?: unknown[];
}

export interface Borrower {
  id: string;
  loanId: string;
  borrowerType: 'primary' | 'secondary' | 'co_signer';
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth: Date;
  maritalStatus?: string;
  relationshipType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanCreateInput {
  locationId: string;
  ghlContactId: string;
  borrower: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  loan: {
    purpose: LoanPurpose;
    loanType: LoanType;
    propertyAddress: string;
  };
  referralSource?: string;
}

export interface LoanUpdateInput {
  status?: LoanStatus;
  loanPurpose?: LoanPurpose;
  loanType?: LoanType;
  occupancyType?: OccupancyType;
  propertyType?: PropertyType;
  purchasePrice?: number;
  baseLoanAmount?: number;
  interestRate?: number;
  rateLockDate?: Date;
  closingDate?: Date;
}
