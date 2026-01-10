// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const complianceCheckTool: Tool = {
  name: 'check_compliance',
  description: 'Check if a message or response requires SAFE Act escalation to a licensed MLO. Use this before responding to borrower questions about rates, terms, or loan advice.',
  inputSchema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'The message content to check for compliance issues',
      },
      context: {
        type: 'string',
        enum: ['borrower_question', 'ai_response', 'general'],
        description: 'Context of the message being checked',
      },
    },
    required: ['message'],
  },
};

const inputSchema = z.object({
  message: z.string(),
  context: z.enum(['borrower_question', 'ai_response', 'general']).optional().default('general'),
});

interface ComplianceResult {
  requiresEscalation: boolean;
  escalationReason?: string;
  matchedKeywords: string[];
  suggestedResponse?: string;
  safeToRespond: boolean;
}

// Keywords that require MLO escalation under SAFE Act
const RATE_KEYWORDS = [
  'rate',
  'rates',
  'apr',
  'interest rate',
  'interest rates',
  'mortgage rate',
  'current rate',
  'today\'s rate',
  'best rate',
  'lock',
  'rate lock',
  'locking',
  'points',
  'discount points',
  'buydown',
  'buy down',
];

const PAYMENT_KEYWORDS = [
  'monthly payment',
  'payment amount',
  'what will my payment be',
  'how much per month',
  'mortgage payment',
  'piti',
  'principal and interest',
];

const ADVICE_KEYWORDS = [
  'should i',
  'should we',
  'recommend',
  'recommendation',
  'which loan',
  'what loan',
  'better option',
  'best option',
  'advise',
  'advice',
  'suggest',
  'what do you think',
  'is it a good idea',
  'would you',
];

const TERMS_KEYWORDS = [
  'loan terms',
  'loan options',
  'loan programs',
  'fha vs',
  'conventional vs',
  'va vs',
  'arm vs',
  'fixed vs',
  '30 year vs',
  '15 year vs',
  'compare loans',
  'comparing',
];

const PRICING_KEYWORDS = [
  'closing costs',
  'how much to close',
  'fees',
  'origination',
  'lender fees',
  'cost to refinance',
  'cost to buy',
];

function checkForKeywords(message: string, keywords: string[]): string[] {
  const lowerMessage = message.toLowerCase();
  return keywords.filter(keyword => lowerMessage.includes(keyword.toLowerCase()));
}

export async function handleComplianceCheck(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const input = inputSchema.parse(args);
  const message = input.message;

  const result: ComplianceResult = {
    requiresEscalation: false,
    matchedKeywords: [],
    safeToRespond: true,
  };

  // Check each category
  const rateMatches = checkForKeywords(message, RATE_KEYWORDS);
  const paymentMatches = checkForKeywords(message, PAYMENT_KEYWORDS);
  const adviceMatches = checkForKeywords(message, ADVICE_KEYWORDS);
  const termsMatches = checkForKeywords(message, TERMS_KEYWORDS);
  const pricingMatches = checkForKeywords(message, PRICING_KEYWORDS);

  result.matchedKeywords = [
    ...rateMatches,
    ...paymentMatches,
    ...adviceMatches,
    ...termsMatches,
    ...pricingMatches,
  ];

  // Determine if escalation is needed
  if (rateMatches.length > 0) {
    result.requiresEscalation = true;
    result.escalationReason = 'RATE_DISCUSSION';
    result.safeToRespond = false;
    result.suggestedResponse = 'That\'s a great question about rates. Under federal regulations, only a licensed loan officer can discuss specific rates and terms. Let me connect you with your loan officer who can provide accurate rate information for your situation.';
  } else if (adviceMatches.length > 0) {
    result.requiresEscalation = true;
    result.escalationReason = 'LOAN_ADVICE_REQUESTED';
    result.safeToRespond = false;
    result.suggestedResponse = 'I appreciate you asking for guidance. Providing loan advice requires a licensed professional under the SAFE Act. Your loan officer will be the best person to help you evaluate your options and make the right decision for your situation.';
  } else if (termsMatches.length > 0) {
    result.requiresEscalation = true;
    result.escalationReason = 'LOAN_TERMS_COMPARISON';
    result.safeToRespond = false;
    result.suggestedResponse = 'Comparing loan programs and terms is something your licensed loan officer specializes in. They can explain the pros and cons of each option based on your specific financial situation.';
  } else if (paymentMatches.length > 0 || pricingMatches.length > 0) {
    result.requiresEscalation = true;
    result.escalationReason = 'PRICING_DISCUSSION';
    result.safeToRespond = false;
    result.suggestedResponse = 'Specific payment and cost calculations depend on many factors including rates and fees. Your loan officer can provide accurate numbers based on current pricing and your loan scenario.';
  }

  let response: string;

  if (result.requiresEscalation) {
    response = `
**SAFE Act Compliance Check: ESCALATION REQUIRED**

Reason: ${result.escalationReason}
Matched Keywords: ${result.matchedKeywords.join(', ')}

**Action Required:**
This question/topic must be handled by a licensed Mortgage Loan Originator (MLO) under the SAFE Act.

**Suggested Response to Borrower:**
"${result.suggestedResponse}"

**Next Steps:**
1. Do NOT provide specific rates, payments, or loan recommendations
2. Notify the assigned MLO via GHL task
3. Send the suggested response to the borrower
4. Log this escalation for compliance records

**Regulatory Reference:**
SAFE Mortgage Licensing Act - 12 USC 5101 et seq.
Prohibits unlicensed individuals from negotiating loan terms or providing loan advice.
`.trim();
  } else {
    response = `
**SAFE Act Compliance Check: CLEAR**

Status: Safe to respond
Matched Keywords: None requiring escalation

The message does not contain topics requiring MLO involvement. You may respond to:
- General loan status questions
- Document upload assistance
- Process timeline questions
- Application status updates
- General information about the loan process

Remember: Never discuss specific rates, payments, fees, or provide loan recommendations.
`.trim();
  }

  return {
    content: [
      {
        type: 'text',
        text: response,
      },
    ],
  };
}
