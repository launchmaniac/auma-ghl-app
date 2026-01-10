// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const loanStatusTool: Tool = {
  name: 'get_loan_status',
  description: 'Get the current status and progress of a loan application. Returns loan stage, milestones, and next steps.',
  inputSchema: {
    type: 'object',
    properties: {
      loanNumber: {
        type: 'string',
        description: 'The loan number (e.g., LN-2024-00001)',
      },
      contactId: {
        type: 'string',
        description: 'GHL contact ID of the borrower',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  loanNumber: z.string().optional(),
  contactId: z.string().optional(),
});

interface LoanStatusResult {
  loanNumber: string;
  status: string;
  statusLabel: string;
  currentStep: number;
  totalSteps: number;
  milestones: {
    step: number;
    label: string;
    status: 'completed' | 'current' | 'pending';
  }[];
  nextActions: string[];
  estimatedCloseDate?: string;
  lastUpdated: string;
}

export async function handleLoanStatus(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const input = inputSchema.parse(args);

  if (!input.loanNumber && !input.contactId) {
    return {
      content: [
        {
          type: 'text',
          text: 'Please provide either a loan number or contact ID to look up the loan status.',
        },
      ],
    };
  }

  // In production, this would query the database
  // For now, return a mock response structure
  const mockResult: LoanStatusResult = {
    loanNumber: input.loanNumber || 'LN-2024-00001',
    status: 'step_3',
    statusLabel: 'Post-Application Call',
    currentStep: 3,
    totalSteps: 8,
    milestones: [
      { step: 1, label: 'Initial Call', status: 'completed' },
      { step: 2, label: 'Application', status: 'completed' },
      { step: 3, label: 'Post-App Call', status: 'current' },
      { step: 4, label: 'LO Review', status: 'pending' },
      { step: 5, label: 'Pre-Approval', status: 'pending' },
      { step: 6, label: 'In Contract', status: 'pending' },
      { step: 7, label: 'Processing', status: 'pending' },
      { step: 8, label: 'Final Approval', status: 'pending' },
    ],
    nextActions: [
      'Complete income verification',
      'Upload remaining bank statements',
      'Schedule post-application call',
    ],
    estimatedCloseDate: '2024-03-15',
    lastUpdated: new Date().toISOString(),
  };

  const response = `
**Loan Status for ${mockResult.loanNumber}**

Current Stage: **${mockResult.statusLabel}** (Step ${mockResult.currentStep} of ${mockResult.totalSteps})

**Progress:**
${mockResult.milestones.map(m => {
  const icon = m.status === 'completed' ? '[x]' : m.status === 'current' ? '[>]' : '[ ]';
  return `${icon} Step ${m.step}: ${m.label}`;
}).join('\n')}

**Next Actions Required:**
${mockResult.nextActions.map(a => `- ${a}`).join('\n')}

${mockResult.estimatedCloseDate ? `Estimated Close Date: ${mockResult.estimatedCloseDate}` : ''}

Last Updated: ${new Date(mockResult.lastUpdated).toLocaleDateString()}
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
