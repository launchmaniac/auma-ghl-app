// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { logger } from '../utils/logger.js';
import type { IncomeType } from '@auma/shared';

// Local type for document data passed to income calculations
interface ExtractedDocumentData {
  documentType: string;
  fields: Record<string, unknown>;
}

// Local type for calculation results (different from the database entity)
interface IncomeCalculationResult {
  incomeType: IncomeType;
  monthlyIncome: number;
  annualIncome: number;
  confidence: number;
  methodology: string;
  notes: string[];
  warnings: string[];
  requiresReview: boolean;
}

interface PaystubData {
  grossPay: number;
  ytdGross: number;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  payFrequency: 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly';
}

interface W2Data {
  wages: number;
  year: number;
}

interface TaxReturnData {
  totalIncome: number;
  adjustedGrossIncome: number;
  year: number;
  schedules?: {
    scheduleC?: { netProfit: number };
    scheduleE?: { netRentalIncome: number; depreciation: number };
  };
}

interface SelfEmployedData {
  netBusinessIncome: number[];  // Array of years
  depreciation: number[];
  oneTimeIncome: number[];
  years: number[];
}

interface RentalIncomeData {
  grossRent: number;
  expenses: number;
  depreciation: number;
  vacancyRate?: number;
}

class IncomeService {
  /**
   * Calculate W-2 employee income following Fannie Mae guidelines
   * Primary method: YTD income / months elapsed
   */
  calculateW2Income(
    paystubs: PaystubData[],
    w2s: W2Data[]
  ): IncomeCalculationResult {
    const warnings: string[] = [];
    const notes: string[] = [];

    // Sort paystubs by date, most recent first
    const sortedPaystubs = [...paystubs].sort(
      (a, b) => b.payPeriodEnd.getTime() - a.payPeriodEnd.getTime()
    );

    const mostRecent = sortedPaystubs[0];
    if (!mostRecent) {
      return {
        incomeType: 'w2_salary',
        monthlyIncome: 0,
        annualIncome: 0,
        confidence: 0,
        methodology: 'No paystub data available',
        notes: [],
        warnings: ['No paystub data provided'],
        requiresReview: true,
      };
    }

    // Calculate months elapsed in year
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthsElapsed = (now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    const effectiveMonths = Math.max(monthsElapsed, 1);

    // Primary calculation: YTD / months
    const monthlyFromYtd = mostRecent.ytdGross / effectiveMonths;

    // Secondary: extrapolate from pay period
    const daysInPeriod = Math.ceil(
      (mostRecent.payPeriodEnd.getTime() - mostRecent.payPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const dailyRate = mostRecent.grossPay / daysInPeriod;
    const monthlyFromPaystub = dailyRate * 30.44;

    // Check variance between methods
    const variance = Math.abs(monthlyFromYtd - monthlyFromPaystub) / monthlyFromYtd;
    if (variance > 0.1) {
      warnings.push(`Variance between YTD and current pay period: ${(variance * 100).toFixed(1)}%`);
    }

    // Use YTD method as primary
    let monthlyIncome = monthlyFromYtd;
    let methodology = `YTD gross ($${mostRecent.ytdGross.toLocaleString()}) / ${effectiveMonths.toFixed(1)} months`;
    notes.push(methodology);

    // Compare to prior year W-2 if available
    const currentYear = now.getFullYear();
    const priorYearW2 = w2s.find(w => w.year === currentYear - 1);
    const twoYearsAgoW2 = w2s.find(w => w.year === currentYear - 2);

    if (priorYearW2) {
      const priorYearMonthly = priorYearW2.wages / 12;
      const yearOverYearChange = (monthlyIncome - priorYearMonthly) / priorYearMonthly;

      if (yearOverYearChange < -0.25) {
        warnings.push(`Income decreased ${(Math.abs(yearOverYearChange) * 100).toFixed(1)}% from prior year`);
      } else if (yearOverYearChange > 0.25) {
        notes.push(`Income increased ${(yearOverYearChange * 100).toFixed(1)}% from prior year`);
      }
    }

    // Calculate confidence based on data quality
    let confidence = 0.9;
    if (variance > 0.2) confidence -= 0.1;
    if (!priorYearW2) confidence -= 0.05;
    if (warnings.length > 0) confidence -= 0.05 * warnings.length;

    return {
      incomeType: 'w2_salary',
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      annualIncome: Math.round(monthlyIncome * 12 * 100) / 100,
      confidence: Math.max(confidence, 0.5),
      methodology,
      notes,
      warnings,
      requiresReview: warnings.length > 0 || confidence < 0.8,
    };
  }

  /**
   * Calculate self-employed income (Schedule C, 1065, 1120S)
   * Uses 2-year average with depreciation add-back
   */
  calculateSelfEmployedIncome(data: SelfEmployedData): IncomeCalculationResult {
    const warnings: string[] = [];
    const notes: string[] = [];

    if (data.years.length < 2) {
      warnings.push('Less than 2 years of self-employment history');
    }

    // Calculate adjusted net income for each year
    const adjustedIncomes = data.years.map((year, i) => {
      const netIncome = data.netBusinessIncome[i] || 0;
      const depreciation = data.depreciation[i] || 0;
      const oneTime = data.oneTimeIncome[i] || 0;

      // Add back depreciation, subtract one-time income
      return netIncome + depreciation - oneTime;
    });

    // Check for declining income trend
    if (adjustedIncomes.length >= 2) {
      const mostRecent = adjustedIncomes[adjustedIncomes.length - 1];
      const previous = adjustedIncomes[adjustedIncomes.length - 2];

      if (mostRecent < previous) {
        const decline = (previous - mostRecent) / previous;
        if (decline > 0.2) {
          warnings.push(`Declining income trend: ${(decline * 100).toFixed(1)}% decrease`);
          notes.push('Using most recent year only due to decline');
        }
      }
    }

    // Calculate average (or use most recent if declining)
    let annualIncome: number;
    let methodology: string;

    if (warnings.some(w => w.includes('Declining'))) {
      annualIncome = adjustedIncomes[adjustedIncomes.length - 1];
      methodology = 'Most recent year (declining trend)';
    } else if (adjustedIncomes.length >= 2) {
      annualIncome = adjustedIncomes.reduce((a, b) => a + b, 0) / adjustedIncomes.length;
      methodology = `${adjustedIncomes.length}-year average with depreciation add-back`;
    } else {
      annualIncome = adjustedIncomes[0] || 0;
      methodology = 'Single year (insufficient history)';
    }

    const monthlyIncome = annualIncome / 12;

    // Build detailed notes
    data.years.forEach((year, i) => {
      notes.push(
        `${year}: Net $${data.netBusinessIncome[i]?.toLocaleString() || 0} + Depreciation $${data.depreciation[i]?.toLocaleString() || 0} = $${adjustedIncomes[i]?.toLocaleString()}`
      );
    });

    let confidence = data.years.length >= 2 ? 0.85 : 0.65;
    if (warnings.length > 0) confidence -= 0.1;

    return {
      incomeType: 'self_employed',
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      annualIncome: Math.round(annualIncome * 100) / 100,
      confidence: Math.max(confidence, 0.5),
      methodology,
      notes,
      warnings,
      requiresReview: warnings.length > 0 || data.years.length < 2,
    };
  }

  /**
   * Calculate rental income from Schedule E
   * Uses net rental income with depreciation add-back
   */
  calculateRentalIncome(
    scheduleEData: RentalIncomeData[],
    useMarketRent: boolean = false
  ): IncomeCalculationResult {
    const warnings: string[] = [];
    const notes: string[] = [];

    let totalAnnualIncome = 0;

    scheduleEData.forEach((property, index) => {
      const netIncome = property.grossRent - property.expenses;
      const adjustedIncome = netIncome + property.depreciation;

      let propertyIncome: number;

      if (useMarketRent) {
        // Apply 75% factor for vacancy/maintenance
        propertyIncome = adjustedIncome * 0.75;
        notes.push(
          `Property ${index + 1}: $${adjustedIncome.toLocaleString()} x 75% = $${propertyIncome.toLocaleString()}`
        );
      } else {
        propertyIncome = adjustedIncome;
        notes.push(
          `Property ${index + 1}: Net $${netIncome.toLocaleString()} + Depreciation $${property.depreciation.toLocaleString()} = $${propertyIncome.toLocaleString()}`
        );
      }

      // Flag negative cash flow properties
      if (netIncome < 0) {
        warnings.push(`Property ${index + 1} has negative cash flow before depreciation`);
      }

      totalAnnualIncome += propertyIncome;
    });

    const monthlyIncome = totalAnnualIncome / 12;
    const methodology = useMarketRent
      ? 'Schedule E with 75% market rent factor'
      : 'Schedule E net rental income with depreciation add-back';

    let confidence = 0.85;
    if (warnings.length > 0) confidence -= 0.1;
    if (totalAnnualIncome < 0) confidence -= 0.2;

    return {
      incomeType: 'rental',
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      annualIncome: Math.round(totalAnnualIncome * 100) / 100,
      confidence: Math.max(confidence, 0.4),
      methodology,
      notes,
      warnings,
      requiresReview: warnings.length > 0 || totalAnnualIncome < 0,
    };
  }

  /**
   * Calculate bonus income (requires 2-year history)
   */
  calculateBonusIncome(bonuses: { year: number; amount: number }[]): IncomeCalculationResult {
    const warnings: string[] = [];
    const notes: string[] = [];

    if (bonuses.length < 2) {
      return {
        incomeType: 'bonus',
        monthlyIncome: 0,
        annualIncome: 0,
        confidence: 0.3,
        methodology: 'Insufficient bonus history (requires 2 years)',
        notes: [],
        warnings: ['Less than 2 years of bonus history - cannot use for qualifying'],
        requiresReview: true,
      };
    }

    // Sort by year
    const sorted = [...bonuses].sort((a, b) => b.year - a.year);
    const mostRecent = sorted[0].amount;
    const previous = sorted[1].amount;

    // Check for declining trend
    let annualBonus: number;
    let methodology: string;

    if (mostRecent < previous) {
      const decline = (previous - mostRecent) / previous;
      if (decline > 0.2) {
        warnings.push(`Bonus declined ${(decline * 100).toFixed(1)}% year-over-year`);
        annualBonus = mostRecent;
        methodology = 'Most recent year only (declining trend)';
      } else {
        annualBonus = (mostRecent + previous) / 2;
        methodology = '2-year average';
      }
    } else {
      annualBonus = (mostRecent + previous) / 2;
      methodology = '2-year average';
    }

    sorted.forEach(b => {
      notes.push(`${b.year}: $${b.amount.toLocaleString()}`);
    });

    const monthlyBonus = annualBonus / 12;
    let confidence = 0.85;
    if (warnings.length > 0) confidence -= 0.15;

    return {
      incomeType: 'bonus',
      monthlyIncome: Math.round(monthlyBonus * 100) / 100,
      annualIncome: Math.round(annualBonus * 100) / 100,
      confidence,
      methodology,
      notes,
      warnings,
      requiresReview: warnings.length > 0,
    };
  }

  /**
   * Calculate commission income (requires 2-year history)
   */
  calculateCommissionIncome(
    commissions: { year: number; amount: number }[],
    baseSalary?: number
  ): IncomeCalculationResult {
    // Commission follows same rules as bonus
    const result = this.calculateBonusIncome(commissions);
    result.incomeType = 'commission';

    if (baseSalary) {
      result.notes.push(`Base salary: $${baseSalary.toLocaleString()}/year (calculated separately)`);
    }

    return result;
  }

  /**
   * Calculate pension/retirement income
   */
  calculatePensionIncome(
    monthlyBenefit: number,
    isTaxable: boolean = true,
    yearsRemaining?: number
  ): IncomeCalculationResult {
    const warnings: string[] = [];
    const notes: string[] = [];

    // Check 3-year continuance
    if (yearsRemaining !== undefined && yearsRemaining < 3) {
      warnings.push('Pension may not continue for 3 years - verify documentation');
    }

    let adjustedMonthly = monthlyBenefit;
    let methodology = 'Monthly pension benefit';

    // Gross up non-taxable income by 25%
    if (!isTaxable) {
      adjustedMonthly = monthlyBenefit * 1.25;
      methodology = 'Monthly pension with 25% gross-up (non-taxable)';
      notes.push(`Original: $${monthlyBenefit.toLocaleString()}, Grossed up: $${adjustedMonthly.toLocaleString()}`);
    }

    return {
      incomeType: 'pension',
      monthlyIncome: Math.round(adjustedMonthly * 100) / 100,
      annualIncome: Math.round(adjustedMonthly * 12 * 100) / 100,
      confidence: warnings.length > 0 ? 0.7 : 0.9,
      methodology,
      notes,
      warnings,
      requiresReview: warnings.length > 0,
    };
  }

  /**
   * Calculate Social Security income
   */
  calculateSocialSecurityIncome(
    grossMonthlyBenefit: number,
    isTaxable: boolean = false
  ): IncomeCalculationResult {
    let adjustedMonthly = grossMonthlyBenefit;
    const notes: string[] = [];
    let methodology = 'Gross Social Security benefit';

    // Gross up non-taxable SSI by 25%
    if (!isTaxable) {
      adjustedMonthly = grossMonthlyBenefit * 1.25;
      methodology = 'Social Security with 25% gross-up (non-taxable)';
      notes.push(`Original: $${grossMonthlyBenefit.toLocaleString()}, Grossed up: $${adjustedMonthly.toLocaleString()}`);
    }

    return {
      incomeType: 'social_security',
      monthlyIncome: Math.round(adjustedMonthly * 100) / 100,
      annualIncome: Math.round(adjustedMonthly * 12 * 100) / 100,
      confidence: 0.95,
      methodology,
      notes,
      warnings: [],
      requiresReview: false,
    };
  }

  /**
   * Process documents and calculate all applicable income types
   */
  async calculateIncomeFromDocuments(
    documents: ExtractedDocumentData[],
    loanId: string
  ): Promise<{
    calculations: IncomeCalculationResult[];
    totalMonthlyIncome: number;
    totalAnnualIncome: number;
    overallConfidence: number;
    requiresReview: boolean;
  }> {
    const calculations: IncomeCalculationResult[] = [];

    // Group documents by type
    const paystubs = documents.filter(d => d.documentType === 'paystub');
    const w2s = documents.filter(d => d.documentType === 'w2');
    const taxReturns = documents.filter(d =>
      ['tax_return_1040', 'tax_return_1065', 'tax_return_1120'].includes(d.documentType)
    );
    const scheduleEs = documents.filter(d => d.documentType === 'schedule_e');

    // Calculate W-2 income if applicable
    if (paystubs.length > 0 || w2s.length > 0) {
      try {
        const paystubData = paystubs.map(p => this.extractPaystubData(p.fields));
        const w2Data = w2s.map(w => this.extractW2Data(w.fields));
        calculations.push(this.calculateW2Income(paystubData, w2Data));
      } catch (error) {
        logger.error('Failed to calculate W-2 income', { loanId, error });
      }
    }

    // Calculate self-employed income if applicable
    const scheduleCDocs = documents.filter(d => d.documentType === 'schedule_c');
    if (scheduleCDocs.length > 0) {
      try {
        const selfEmployedData = this.extractSelfEmployedData(scheduleCDocs);
        calculations.push(this.calculateSelfEmployedIncome(selfEmployedData));
      } catch (error) {
        logger.error('Failed to calculate self-employed income', { loanId, error });
      }
    }

    // Calculate rental income if applicable
    if (scheduleEs.length > 0) {
      try {
        const rentalData = scheduleEs.map(e => this.extractRentalData(e.fields));
        calculations.push(this.calculateRentalIncome(rentalData));
      } catch (error) {
        logger.error('Failed to calculate rental income', { loanId, error });
      }
    }

    // Calculate totals
    const totalMonthlyIncome = calculations.reduce((sum, c) => sum + c.monthlyIncome, 0);
    const totalAnnualIncome = calculations.reduce((sum, c) => sum + c.annualIncome, 0);

    // Calculate weighted confidence
    const overallConfidence = calculations.length > 0
      ? calculations.reduce((sum, c) => sum + c.confidence * c.monthlyIncome, 0) / totalMonthlyIncome
      : 0;

    const requiresReview = calculations.some(c => c.requiresReview);

    return {
      calculations,
      totalMonthlyIncome: Math.round(totalMonthlyIncome * 100) / 100,
      totalAnnualIncome: Math.round(totalAnnualIncome * 100) / 100,
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      requiresReview,
    };
  }

  private extractPaystubData(fields: Record<string, unknown>): PaystubData {
    return {
      grossPay: Number(fields.grossPay) || 0,
      ytdGross: Number(fields.ytdGross) || 0,
      payPeriodStart: new Date(fields.payPeriodStart as string),
      payPeriodEnd: new Date(fields.payPeriodEnd as string),
      payFrequency: (fields.payFrequency as PaystubData['payFrequency']) || 'biweekly',
    };
  }

  private extractW2Data(fields: Record<string, unknown>): W2Data {
    return {
      wages: Number(fields.wages) || Number(fields.wagesTipsCompensation) || 0,
      year: Number(fields.taxYear) || new Date().getFullYear() - 1,
    };
  }

  private extractSelfEmployedData(docs: ExtractedDocumentData[]): SelfEmployedData {
    const years: number[] = [];
    const netBusinessIncome: number[] = [];
    const depreciation: number[] = [];
    const oneTimeIncome: number[] = [];

    docs.forEach(doc => {
      years.push(Number(doc.fields.taxYear) || new Date().getFullYear() - 1);
      netBusinessIncome.push(Number(doc.fields.netProfit) || 0);
      depreciation.push(Number(doc.fields.depreciation) || 0);
      oneTimeIncome.push(Number(doc.fields.oneTimeIncome) || 0);
    });

    return { years, netBusinessIncome, depreciation, oneTimeIncome };
  }

  private extractRentalData(fields: Record<string, unknown>): RentalIncomeData {
    return {
      grossRent: Number(fields.grossRent) || 0,
      expenses: Number(fields.totalExpenses) || 0,
      depreciation: Number(fields.depreciation) || 0,
      vacancyRate: Number(fields.vacancyRate) || undefined,
    };
  }
}

export const incomeService = new IncomeService();
