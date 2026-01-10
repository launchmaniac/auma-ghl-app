// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const incomeCalcTool: Tool = {
  name: 'calculate_income',
  description: 'Calculate qualifying income based on employment type and documentation. Follows Fannie Mae guidelines for income calculation.',
  inputSchema: {
    type: 'object',
    properties: {
      employmentType: {
        type: 'string',
        enum: ['w2', 'self_employed', 'rental', 'social_security', 'pension', 'other'],
        description: 'Type of employment/income source',
      },
      annualIncome: {
        type: 'number',
        description: 'Stated annual income in dollars',
      },
      ytdIncome: {
        type: 'number',
        description: 'Year-to-date income from pay stubs',
      },
      monthsWorked: {
        type: 'number',
        description: 'Number of months worked in current year',
      },
      priorYearIncome: {
        type: 'number',
        description: 'Prior year total income (from W-2 or tax return)',
      },
      twoYearsAgoIncome: {
        type: 'number',
        description: 'Income from two years ago (for trending)',
      },
      overtimeIncome: {
        type: 'number',
        description: 'Annual overtime income (requires 2-year history)',
      },
      bonusIncome: {
        type: 'number',
        description: 'Annual bonus income (requires 2-year history)',
      },
      commissionIncome: {
        type: 'number',
        description: 'Annual commission income (requires 2-year history)',
      },
    },
    required: ['employmentType'],
  },
};

const inputSchema = z.object({
  employmentType: z.enum(['w2', 'self_employed', 'rental', 'social_security', 'pension', 'other']),
  annualIncome: z.number().optional(),
  ytdIncome: z.number().optional(),
  monthsWorked: z.number().optional(),
  priorYearIncome: z.number().optional(),
  twoYearsAgoIncome: z.number().optional(),
  overtimeIncome: z.number().optional(),
  bonusIncome: z.number().optional(),
  commissionIncome: z.number().optional(),
});

interface IncomeCalculation {
  method: string;
  monthlyIncome: number;
  annualIncome: number;
  notes: string[];
  documentsNeeded: string[];
  warnings: string[];
}

function calculateW2Income(input: z.infer<typeof inputSchema>): IncomeCalculation {
  const notes: string[] = [];
  const warnings: string[] = [];
  const documentsNeeded: string[] = [];
  let monthlyIncome = 0;
  let method = 'Base salary';

  // Base income calculation
  if (input.ytdIncome && input.monthsWorked && input.monthsWorked > 0) {
    const ytdMonthly = input.ytdIncome / input.monthsWorked;

    if (input.priorYearIncome) {
      const priorMonthly = input.priorYearIncome / 12;

      // Use lower of YTD annualized vs prior year (conservative)
      if (ytdMonthly < priorMonthly * 0.9) {
        warnings.push('YTD income is more than 10% lower than prior year - using YTD calculation');
        monthlyIncome = ytdMonthly;
        method = 'YTD annualized (declining income)';
      } else {
        monthlyIncome = Math.min(ytdMonthly, priorMonthly);
        method = 'Lower of YTD or prior year average';
      }
      notes.push(`YTD monthly: $${ytdMonthly.toFixed(2)}`);
      notes.push(`Prior year monthly: $${priorMonthly.toFixed(2)}`);
    } else {
      monthlyIncome = ytdMonthly;
      method = 'YTD annualized';
      documentsNeeded.push('Prior year W-2 for income verification');
    }
  } else if (input.annualIncome) {
    monthlyIncome = input.annualIncome / 12;
    method = 'Stated annual income';
    documentsNeeded.push('Recent pay stubs (30 days)');
    documentsNeeded.push('Prior year W-2');
  }

  // Variable income (OT, bonus, commission) - requires 2-year average
  const variableIncome = (input.overtimeIncome || 0) + (input.bonusIncome || 0) + (input.commissionIncome || 0);
  if (variableIncome > 0) {
    if (input.twoYearsAgoIncome) {
      // Can use 2-year average for variable income
      monthlyIncome += variableIncome / 12;
      notes.push(`Variable income (2-year avg): $${(variableIncome / 12).toFixed(2)}/mo`);
    } else {
      warnings.push('Variable income (OT/bonus/commission) requires 2-year history - not included');
      documentsNeeded.push('W-2s from past 2 years for variable income');
    }
  }

  return {
    method,
    monthlyIncome,
    annualIncome: monthlyIncome * 12,
    notes,
    documentsNeeded,
    warnings,
  };
}

function calculateSelfEmployedIncome(input: z.infer<typeof inputSchema>): IncomeCalculation {
  const notes: string[] = [];
  const warnings: string[] = [];
  const documentsNeeded: string[] = ['2 years of personal tax returns', '2 years of business tax returns', 'Year-to-date P&L statement'];
  let monthlyIncome = 0;
  let method = 'Self-employed 2-year average';

  if (input.priorYearIncome && input.twoYearsAgoIncome) {
    // Check for declining income
    if (input.priorYearIncome < input.twoYearsAgoIncome * 0.8) {
      // Income declined more than 20% - use most recent year only
      monthlyIncome = input.priorYearIncome / 12;
      method = 'Most recent year (declining income)';
      warnings.push('Income declined >20% year-over-year - using most recent year only');
    } else {
      // Standard 2-year average
      const twoYearTotal = input.priorYearIncome + input.twoYearsAgoIncome;
      monthlyIncome = twoYearTotal / 24;
      method = '2-year average';
    }
    notes.push(`Prior year: $${input.priorYearIncome.toLocaleString()}`);
    notes.push(`Two years ago: $${input.twoYearsAgoIncome.toLocaleString()}`);
  } else if (input.annualIncome) {
    monthlyIncome = input.annualIncome / 12;
    method = 'Stated income (pending verification)';
    warnings.push('Self-employed income requires 2-year tax return history for verification');
  }

  return {
    method,
    monthlyIncome,
    annualIncome: monthlyIncome * 12,
    notes,
    documentsNeeded,
    warnings,
  };
}

export async function handleIncomeCalc(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const input = inputSchema.parse(args);

  let result: IncomeCalculation;

  switch (input.employmentType) {
    case 'w2':
      result = calculateW2Income(input);
      break;
    case 'self_employed':
      result = calculateSelfEmployedIncome(input);
      break;
    case 'rental':
      result = {
        method: 'Schedule E rental income',
        monthlyIncome: (input.annualIncome || 0) * 0.75 / 12, // 75% of gross after vacancy/expenses
        annualIncome: (input.annualIncome || 0) * 0.75,
        notes: ['Using 75% of gross rent for qualifying (25% vacancy/expense factor)'],
        documentsNeeded: ['2 years tax returns with Schedule E', 'Lease agreements', 'Proof of ownership'],
        warnings: [],
      };
      break;
    case 'social_security':
    case 'pension':
      result = {
        method: 'Fixed income',
        monthlyIncome: (input.annualIncome || 0) / 12,
        annualIncome: input.annualIncome || 0,
        notes: ['Fixed income - no trending required'],
        documentsNeeded: ['Award letter or benefit statement', '1099-SSA or 1099-R'],
        warnings: [],
      };
      break;
    default:
      result = {
        method: 'Other income',
        monthlyIncome: (input.annualIncome || 0) / 12,
        annualIncome: input.annualIncome || 0,
        notes: [],
        documentsNeeded: ['Documentation of income source', '2 years history if variable'],
        warnings: ['Other income types require underwriter review'],
      };
  }

  const response = `
**Income Calculation - ${input.employmentType.toUpperCase().replace('_', ' ')}**

Calculation Method: ${result.method}

**Qualifying Income:**
- Monthly: $${result.monthlyIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Annual: $${result.annualIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

${result.notes.length > 0 ? `**Calculation Notes:**\n${result.notes.map(n => `- ${n}`).join('\n')}` : ''}

${result.warnings.length > 0 ? `**Warnings:**\n${result.warnings.map(w => `- ${w}`).join('\n')}` : ''}

**Documents Needed:**
${result.documentsNeeded.map(d => `- ${d}`).join('\n')}

*Note: This is an estimate for pre-qualification purposes. Final income will be verified by underwriting.*
`.trim();

  return {
    content: [
      {
        type: 'text',
        text: response,
      },
    ],
  };
}
