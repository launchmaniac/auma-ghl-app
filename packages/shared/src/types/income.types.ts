// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

export type IncomeType =
  | 'w2_salary'
  | 'w2_hourly'
  | 'overtime'
  | 'bonus'
  | 'commission'
  | 'self_employed'
  | 'rental'
  | 'social_security'
  | 'pension'
  | 'alimony'
  | 'child_support'
  | 'other';

export type PayFrequency = 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly';

export interface IncomeCalculation {
  id: string;
  loanId: string;
  borrowerId: string;
  incomeType: IncomeType;
  calculationMethod: string;

  // Results
  monthlyIncome: number;
  annualIncome: number;
  confidenceScore: number;

  // Breakdown
  breakdown: IncomeBreakdown;

  // Flags and Warnings
  flags: IncomeFlag[];
  notesForLo: string;

  // Source Documents
  documentIds: string[];

  // Metadata
  calculatedBy: 'ai_assistant' | 'human_processor' | 'mlo';
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IncomeBreakdown {
  // W-2 Salary/Hourly
  hourlyRate?: number;
  hoursPerWeek?: number;
  payFrequency?: PayFrequency;
  basePay?: number;

  // Variable Income
  overtimeYtd?: number;
  overtimeYear1?: number;
  overtimeYear2?: number;
  bonusYtd?: number;
  bonusYear1?: number;
  bonusYear2?: number;
  commissionYtd?: number;
  commissionYear1?: number;
  commissionYear2?: number;

  // Self-Employment (Schedule C)
  netProfit?: number;
  depreciationAddBack?: number;
  depletionAddBack?: number;
  businessUseOfHomeAddBack?: number;
  adjustedNetIncome?: number;
  quickRatio?: number;

  // Rental Income (Schedule E)
  grossRents?: number;
  totalExpenses?: number;
  netRentalIncome?: number;
  depreciation?: number;
  mortgageInterest?: number;
  taxesAndInsurance?: number;
  vacancyFactor?: number;
}

export interface IncomeFlag {
  type: IncomeVarianceType;
  severity: 'info' | 'warning' | 'error';
  message: string;
  details?: Record<string, unknown>;
}

export type IncomeVarianceType =
  | 'ytd_variance'
  | 'declining_income'
  | 'insufficient_history'
  | 'missing_documentation'
  | 'business_solvency'
  | 'gap_in_employment'
  | 'recent_job_change';

export interface IncomeCalculationInput {
  loanId: string;
  borrowerId: string;
  documentIds: string[];
  calculationType: IncomeType;
}

export interface IncomeCalculationResult {
  status: 'calculated' | 'needs_review' | 'failed';
  monthlyIncome: number;
  calculationMethod: string;
  breakdown: IncomeBreakdown;
  confidenceScore: number;
  flags: IncomeFlag[];
  notesForLo: string;
}

// Calculation formulas based on pay frequency
export const PAY_FREQUENCY_MULTIPLIERS: Record<PayFrequency, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semi_monthly: 24 / 12,
  monthly: 1,
} as const;

// Variance thresholds for flagging
export const INCOME_VARIANCE_THRESHOLD = 0.1; // 10%
export const DECLINING_INCOME_THRESHOLD = 0.2; // 20%
export const BUSINESS_SOLVENCY_THRESHOLD = 1.0; // Quick Ratio < 1.0
export const RENTAL_VACANCY_FACTOR = 0.75; // 75% of gross rent
