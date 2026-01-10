// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { DocumentType, IncomeType } from '@auma/shared';

// Local type definitions for OCR processing
interface OcrResult {
  confidence: number;
  extractedFields: Record<string, unknown>;
  rawText: string;
  documentType: DocumentType;
}

interface ExtractedDocumentData {
  documentType: DocumentType;
  fields: Record<string, unknown>;
}

interface ComplianceResult {
  blocked: boolean;
  escalationReason: string | null;
  suggestedResponse: string | null;
  requiresHumanReview: boolean;
  flaggedKeywords: string[];
}

interface DeepseekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
}

interface DeepseekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const SAFE_ACT_SYSTEM_PROMPT = `You are an AI assistant for a mortgage loan processing system. You operate under strict SAFE Act compliance requirements.

CRITICAL RULES - YOU MUST FOLLOW THESE:
1. NEVER provide advice on loan rates, APR, interest rates, or monthly payments
2. NEVER recommend specific loan products or terms
3. NEVER say phrases like "you should", "I recommend", "the best option", or "I advise"
4. You are a DATA CONDUIT ONLY - extract, organize, and present information
5. Any questions about rates, payments, or loan advice must be escalated to a licensed MLO

When extracting document data:
- Follow Fannie Mae guidelines for income calculation
- Flag any discrepancies or items needing human review
- Provide confidence scores for extracted fields
- Note any potential fraud indicators (altered documents, inconsistent data)`;

class DeepseekService {
  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor() {
    this.baseUrl = config.deepseekBaseUrl;
    this.apiKey = config.deepseekApiKey;
    this.model = config.deepseekModel;
  }

  private async callApi(messages: DeepseekMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Deepseek API error', { status: response.status, error });
      throw new Error(`Deepseek API error: ${response.status}`);
    }

    const data = (await response.json()) as DeepseekResponse;
    return data.choices[0]?.message?.content || '';
  }

  async processDocument(
    fileBuffer: Buffer,
    documentType: DocumentType
  ): Promise<OcrResult> {
    const base64Image = fileBuffer.toString('base64');
    const mimeType = this.detectMimeType(fileBuffer);

    const extractionPrompt = this.getExtractionPrompt(documentType);

    try {
      const response = await this.callApi([
        { role: 'system', content: SAFE_ACT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
            {
              type: 'text',
              text: extractionPrompt,
            },
          ],
        },
      ]);

      const parsed = this.parseExtractionResponse(response, documentType);

      logger.info('Document processed successfully', {
        documentType,
        confidence: parsed.confidence,
        fieldsExtracted: Object.keys(parsed.extractedFields).length,
      });

      return parsed;
    } catch (error) {
      logger.error('Document processing failed', { documentType, error });
      throw error;
    }
  }

  async analyzeIncome(
    documents: ExtractedDocumentData[],
    incomeType: IncomeType
  ): Promise<{
    monthlyIncome: number;
    annualIncome: number;
    confidence: number;
    methodology: string;
    notes: string[];
    warnings: string[];
  }> {
    const prompt = this.getIncomeAnalysisPrompt(documents, incomeType);

    const response = await this.callApi([
      { role: 'system', content: SAFE_ACT_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    return this.parseIncomeAnalysis(response);
  }

  async checkCompliance(
    message: string,
    context: { borrowerName: string; loanId: string }
  ): Promise<ComplianceResult> {
    // Quick keyword check before API call
    const rateKeywords = ['rate', 'apr', 'interest', 'payment', 'monthly', 'lock', 'points'];
    const adviceKeywords = ['should i', 'recommend', 'better', 'best loan', 'advice', 'which loan', 'what loan'];

    const messageLower = message.toLowerCase();
    const hasRateKeyword = rateKeywords.some(k => messageLower.includes(k));
    const hasAdviceKeyword = adviceKeywords.some(k => messageLower.includes(k));

    if (hasRateKeyword || hasAdviceKeyword) {
      return {
        blocked: true,
        escalationReason: hasRateKeyword ? 'SAFE_ACT_RATE_INQUIRY' : 'SAFE_ACT_ADVICE_REQUEST',
        suggestedResponse: `That's an important question about your loan. I've notified your licensed Mortgage Loan Originator who will contact you within 2 hours to discuss this in detail.`,
        requiresHumanReview: true,
        flaggedKeywords: [
          ...rateKeywords.filter(k => messageLower.includes(k)),
          ...adviceKeywords.filter(k => messageLower.includes(k)),
        ],
      };
    }

    // Additional AI-based compliance check for subtle violations
    const response = await this.callApi([
      {
        role: 'system',
        content: `You are a SAFE Act compliance checker. Analyze the following message for any requests about:
1. Loan rates, APR, or interest rates
2. Monthly payment amounts
3. Loan product recommendations
4. Financial advice

Respond with JSON: {"blocked": boolean, "reason": string or null, "keywords": string[]}`,
      },
      { role: 'user', content: message },
    ]);

    try {
      const parsed = JSON.parse(response);
      if (parsed.blocked) {
        return {
          blocked: true,
          escalationReason: 'SAFE_ACT_AI_DETECTED',
          suggestedResponse: `I appreciate your question. This requires input from your licensed Mortgage Loan Originator. They will reach out to you shortly.`,
          requiresHumanReview: true,
          flaggedKeywords: parsed.keywords || [],
        };
      }
    } catch {
      // If parsing fails, allow the message through with logging
      logger.warn('Compliance check parse failed, allowing message', { message });
    }

    return {
      blocked: false,
      escalationReason: null,
      suggestedResponse: null,
      requiresHumanReview: false,
      flaggedKeywords: [],
    };
  }

  async generateMloNotes(
    loanData: Record<string, unknown>,
    documents: ExtractedDocumentData[],
    calculatedIncome: number
  ): Promise<string> {
    const prompt = `Generate internal handoff notes for the MLO reviewing this loan file.

Loan Data:
${JSON.stringify(loanData, null, 2)}

Documents Processed:
${documents.map(d => `- ${d.documentType}: ${Object.keys(d.fields).join(', ')}`).join('\n')}

Calculated Monthly Income: $${calculatedIncome.toLocaleString()}

Create professional, concise notes that highlight:
1. Key borrower information
2. Income summary and methodology used
3. Any flags or items requiring MLO attention
4. Missing documentation
5. Potential concerns or discrepancies

Format as plain text suitable for internal use.`;

    const response = await this.callApi([
      { role: 'system', content: SAFE_ACT_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    return response;
  }

  private getExtractionPrompt(documentType: DocumentType): string {
    const prompts: Record<DocumentType, string> = {
      paystub: `Extract the following from this paystub:
- Employee name
- Employer name
- Pay period dates (start and end)
- Gross pay (current period)
- YTD gross pay
- Net pay
- All deductions (itemized)
- Pay frequency (weekly/bi-weekly/semi-monthly/monthly)

Return as JSON with confidence scores (0-1) for each field.`,

      w2: `Extract the following from this W-2:
- Employee name and SSN (last 4 only)
- Employer name and EIN
- Wages, tips, other compensation (Box 1)
- Federal income tax withheld (Box 2)
- Social security wages (Box 3)
- Medicare wages (Box 5)
- Tax year

Return as JSON with confidence scores (0-1) for each field.`,

      tax_return_1040: `Extract the following from this Form 1040:
- Taxpayer name(s)
- Filing status
- Tax year
- Total income (Line 9)
- Adjusted gross income (Line 11)
- Taxable income
- All Schedule attachments indicated

Return as JSON with confidence scores (0-1) for each field.`,

      bank_statement: `Extract the following from this bank statement:
- Account holder name
- Bank name
- Account number (last 4 only)
- Statement period
- Beginning balance
- Ending balance
- Total deposits
- Total withdrawals
- Any deposits over $5,000 (flag for large deposit verification)

Return as JSON with confidence scores (0-1) for each field.`,

      drivers_license: `Extract the following from this driver's license:
- Full name
- Address
- Date of birth
- License number (last 4 only)
- Expiration date
- State issued

Return as JSON with confidence scores (0-1) for each field.`,

      purchase_agreement: `Extract the following from this purchase agreement:
- Property address
- Purchase price
- Earnest money amount
- Closing date
- Buyer name(s)
- Seller name(s)
- Contingencies listed

Return as JSON with confidence scores (0-1) for each field.`,

      appraisal: `Extract the following from this appraisal:
- Property address
- Appraised value
- Appraisal date
- Appraiser name and license number
- Property type
- Square footage
- Year built
- Comparable sales used

Return as JSON with confidence scores (0-1) for each field.`,

      // Add other document types as needed
      tax_return_1120: 'Extract corporate tax return data following IRS Form 1120 structure.',
      tax_return_1065: 'Extract partnership tax return data following IRS Form 1065 structure.',
      schedule_c: 'Extract Schedule C self-employment income data.',
      schedule_e: 'Extract Schedule E rental income data.',
      k1: 'Extract K-1 partnership/S-corp income data.',
      investment_statement: 'Extract investment account details and balances.',
      retirement_statement: 'Extract retirement account details and balances.',
      passport: 'Extract passport identification data.',
      social_security_card: 'Extract SSN (last 4 only) and name.',
      title_commitment: 'Extract title commitment details.',
      homeowners_insurance: 'Extract insurance policy details and coverage amounts.',
      survey: 'Extract property survey details.',
      other: 'Extract all relevant data from this document and return as JSON.',
    };

    return prompts[documentType];
  }

  private getIncomeAnalysisPrompt(
    documents: ExtractedDocumentData[],
    incomeType: IncomeType
  ): string {
    const basePrompt = `Analyze the following documents to calculate qualifying income.

Documents:
${JSON.stringify(documents, null, 2)}

Income Type: ${incomeType}

`;

    const methodologyPrompts: Record<IncomeType, string> = {
      w2_salary: `For W-2 salaried employee income:
1. If YTD income available: (YTD Gross / Months Elapsed) = Monthly Income
2. Verify consistency with prior year W-2 if available
3. Flag any significant variance (>25%) between current and prior year
4. Verify employment continuity`,

      w2_hourly: `For W-2 hourly employee income:
1. Calculate: Hourly Rate x Average Hours x Pay Frequency Multiplier
2. Use 2-year average of hours if variable
3. Verify consistent hours worked
4. Include regular overtime if consistent for 2+ years`,

      overtime: `For overtime income:
1. Require 2-year history of overtime
2. Use 2-year average
3. If declining, use most recent year only
4. Verify overtime is likely to continue`,

      self_employed: `For self-employed income (Schedule C or 1065/1120S):
1. Use 2-year average of net business income
2. Add back depreciation and non-cash expenses
3. Subtract any one-time income
4. Apply appropriate trending if declining
5. Flag if less than 2 years history`,

      rental: `For rental income (Schedule E):
1. Use net rental income from Schedule E
2. Add back depreciation
3. Subtract any negative cash flow
4. Apply 75% factor for vacancy/maintenance if using market rent
5. Verify property ownership`,

      pension: `For pension/retirement income:
1. Verify income is ongoing (not lump sum)
2. Confirm 3-year continuance likely
3. Use current monthly benefit amount`,

      social_security: `For Social Security income:
1. Use gross benefit amount (before Medicare deduction)
2. May gross up by 25% if non-taxable
3. Verify with award letter or 1099-SSA`,

      bonus: `For bonus income:
1. Require 2-year history of bonus payments
2. Use 2-year average
3. If declining, use most recent year only
4. Flag if variance exceeds 20%`,

      commission: `For commission income:
1. Require 2-year history
2. Use 2-year average
3. If declining trend, analyze cause
4. Verify base salary separately`,

      alimony: `For alimony income:
1. Verify court order or separation agreement
2. Confirm payments for at least 6 months
3. Verify 3-year continuance from closing date
4. Document payment history`,

      child_support: `For child support income:
1. Verify court order or separation agreement
2. Confirm payments for at least 6 months
3. Verify continuance for at least 3 years
4. Document payment history`,

      other: `For other income types:
1. Document the source clearly
2. Verify likelihood of continuance
3. Apply appropriate documentation requirements`,
    };

    return basePrompt + (methodologyPrompts[incomeType] || methodologyPrompts.other) + `

Return JSON with:
{
  "monthlyIncome": number,
  "annualIncome": number,
  "confidence": number (0-1),
  "methodology": "description of calculation method used",
  "notes": ["array of relevant notes"],
  "warnings": ["array of any concerns or flags"]
}`;
  }

  private parseExtractionResponse(response: string, documentType: DocumentType): OcrResult {
    try {
      // Try to parse as JSON first
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Calculate overall confidence from field confidences
        const confidences: number[] = [];
        const extractedFields: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(parsed)) {
          if (typeof value === 'object' && value !== null && 'value' in value && 'confidence' in value) {
            extractedFields[key] = (value as { value: unknown }).value;
            confidences.push((value as { confidence: number }).confidence);
          } else {
            extractedFields[key] = value;
            confidences.push(0.8); // Default confidence if not specified
          }
        }

        const avgConfidence = confidences.length > 0
          ? confidences.reduce((a, b) => a + b, 0) / confidences.length
          : 0.5;

        return {
          confidence: avgConfidence,
          extractedFields,
          rawText: response,
          documentType,
        };
      }
    } catch (error) {
      logger.warn('Failed to parse extraction response as JSON', { documentType, error });
    }

    // Fallback: return raw text with low confidence
    return {
      confidence: 0.3,
      extractedFields: { rawExtraction: response },
      rawText: response,
      documentType,
    };
  }

  private parseIncomeAnalysis(response: string): {
    monthlyIncome: number;
    annualIncome: number;
    confidence: number;
    methodology: string;
    notes: string[];
    warnings: string[];
  } {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          monthlyIncome: parsed.monthlyIncome || 0,
          annualIncome: parsed.annualIncome || parsed.monthlyIncome * 12 || 0,
          confidence: parsed.confidence || 0.5,
          methodology: parsed.methodology || 'Unknown',
          notes: parsed.notes || [],
          warnings: parsed.warnings || [],
        };
      }
    } catch (error) {
      logger.error('Failed to parse income analysis', { error });
    }

    return {
      monthlyIncome: 0,
      annualIncome: 0,
      confidence: 0,
      methodology: 'Failed to parse AI response',
      notes: [],
      warnings: ['Income analysis failed - manual review required'],
    };
  }

  private detectMimeType(buffer: Buffer): string {
    // Check magic bytes for common formats
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
      return 'application/pdf';
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return 'image/png';
    }
    if (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) {
      return 'image/tiff';
    }
    if (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a) {
      return 'image/tiff';
    }

    return 'application/octet-stream';
  }
}

export const deepseekService = new DeepseekService();
