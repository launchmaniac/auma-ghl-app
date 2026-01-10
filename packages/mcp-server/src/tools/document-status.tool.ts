// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const documentStatusTool: Tool = {
  name: 'get_document_status',
  description: 'Get the status of documents for a loan, including what has been uploaded, what is still needed, and any documents requiring attention.',
  inputSchema: {
    type: 'object',
    properties: {
      loanNumber: {
        type: 'string',
        description: 'The loan number to check documents for',
      },
      contactId: {
        type: 'string',
        description: 'GHL contact ID of the borrower',
      },
      documentType: {
        type: 'string',
        description: 'Optional: filter by specific document type',
      },
    },
    required: [],
  },
};

const inputSchema = z.object({
  loanNumber: z.string().optional(),
  contactId: z.string().optional(),
  documentType: z.string().optional(),
});

interface DocumentInfo {
  id: string;
  type: string;
  typeLabel: string;
  fileName?: string;
  status: 'pending' | 'uploaded' | 'processing' | 'verified' | 'needs_review' | 'rejected';
  uploadedAt?: string;
  notes?: string;
}

interface DocumentStatusResult {
  loanNumber: string;
  documents: DocumentInfo[];
  summary: {
    total: number;
    uploaded: number;
    verified: number;
    needsAttention: number;
    pending: number;
  };
}

export async function handleDocumentStatus(args: unknown): Promise<{ content: { type: 'text'; text: string }[] }> {
  const input = inputSchema.parse(args);

  if (!input.loanNumber && !input.contactId) {
    return {
      content: [
        {
          type: 'text',
          text: 'Please provide either a loan number or contact ID to look up document status.',
        },
      ],
    };
  }

  // Mock document data - in production, query from database
  const mockResult: DocumentStatusResult = {
    loanNumber: input.loanNumber || 'LN-2024-00001',
    documents: [
      {
        id: 'doc-1',
        type: 'paystub',
        typeLabel: 'Pay Stub (30 days)',
        fileName: 'paystub_jan2024.pdf',
        status: 'verified',
        uploadedAt: '2024-01-15T10:30:00Z',
      },
      {
        id: 'doc-2',
        type: 'w2',
        typeLabel: 'W-2 (2023)',
        fileName: 'w2_2023.pdf',
        status: 'verified',
        uploadedAt: '2024-01-15T10:32:00Z',
      },
      {
        id: 'doc-3',
        type: 'bank_statement',
        typeLabel: 'Bank Statement (2 months)',
        fileName: 'chase_dec2023.pdf',
        status: 'needs_review',
        uploadedAt: '2024-01-16T14:20:00Z',
        notes: 'Only 1 month provided - need December statement',
      },
      {
        id: 'doc-4',
        type: 'drivers_license',
        typeLabel: "Driver's License",
        status: 'pending',
      },
      {
        id: 'doc-5',
        type: 'tax_return_1040',
        typeLabel: 'Tax Return (2022)',
        status: 'pending',
      },
      {
        id: 'doc-6',
        type: 'tax_return_1040',
        typeLabel: 'Tax Return (2023)',
        status: 'pending',
      },
    ],
    summary: {
      total: 6,
      uploaded: 3,
      verified: 2,
      needsAttention: 1,
      pending: 3,
    },
  };

  // Filter by document type if specified
  let filteredDocs = mockResult.documents;
  if (input.documentType) {
    filteredDocs = filteredDocs.filter(d =>
      d.type.toLowerCase().includes(input.documentType!.toLowerCase()) ||
      d.typeLabel.toLowerCase().includes(input.documentType!.toLowerCase())
    );
  }

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'verified': return '[OK]';
      case 'uploaded':
      case 'processing': return '[...]';
      case 'needs_review': return '[!]';
      case 'rejected': return '[X]';
      default: return '[ ]';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'verified': return 'Verified';
      case 'uploaded': return 'Uploaded';
      case 'processing': return 'Processing';
      case 'needs_review': return 'Needs Review';
      case 'rejected': return 'Rejected';
      default: return 'Not Uploaded';
    }
  };

  const needsAttention = filteredDocs.filter(d => d.status === 'needs_review' || d.status === 'rejected');
  const pending = filteredDocs.filter(d => d.status === 'pending');

  const response = `
**Document Status for ${mockResult.loanNumber}**

**Summary:**
- Total Documents: ${mockResult.summary.total}
- Verified: ${mockResult.summary.verified}
- Needs Attention: ${mockResult.summary.needsAttention}
- Still Needed: ${mockResult.summary.pending}

**All Documents:**
${filteredDocs.map(d => {
  let line = `${getStatusIcon(d.status)} ${d.typeLabel} - ${getStatusLabel(d.status)}`;
  if (d.fileName) line += ` (${d.fileName})`;
  if (d.notes) line += `\n   Note: ${d.notes}`;
  return line;
}).join('\n')}

${needsAttention.length > 0 ? `
**Action Required:**
${needsAttention.map(d => `- ${d.typeLabel}: ${d.notes || 'Please review and resubmit'}`).join('\n')}
` : ''}

${pending.length > 0 ? `
**Documents Still Needed:**
${pending.map(d => `- ${d.typeLabel}`).join('\n')}

To upload documents, visit your loan portal or reply with the documents attached.
` : '**All required documents have been received!**'}
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
