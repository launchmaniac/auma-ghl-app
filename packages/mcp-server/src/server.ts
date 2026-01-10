// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loanStatusTool, handleLoanStatus } from './tools/loan-status.tool.js';
import { incomeCalcTool, handleIncomeCalc } from './tools/income-calc.tool.js';
import { complianceCheckTool, handleComplianceCheck } from './tools/compliance-check.tool.js';
import { documentStatusTool, handleDocumentStatus } from './tools/document-status.tool.js';
import { SAFE_ACT_GUARDRAILS_PROMPT, BORROWER_ASSISTANCE_PROMPT } from './prompts/index.js';

const server = new Server(
  {
    name: 'auma-mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      loanStatusTool,
      incomeCalcTool,
      complianceCheckTool,
      documentStatusTool,
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'get_loan_status':
        return await handleLoanStatus(args);

      case 'calculate_income':
        return await handleIncomeCalc(args);

      case 'check_compliance':
        return await handleComplianceCheck(args);

      case 'get_document_status':
        return await handleDocumentStatus(args);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// List available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'safe-act-guardrails',
        description: 'SAFE Act compliance guardrails for mortgage conversations',
      },
      {
        name: 'borrower-assistance',
        description: 'General borrower assistance prompt with SAFE Act compliance',
      },
    ],
  };
});

// Get specific prompt
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;

  switch (name) {
    case 'safe-act-guardrails':
      return {
        description: 'SAFE Act compliance guardrails for mortgage conversations',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: SAFE_ACT_GUARDRAILS_PROMPT,
            },
          },
        ],
      };

    case 'borrower-assistance':
      return {
        description: 'General borrower assistance prompt with SAFE Act compliance',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: BORROWER_ASSISTANCE_PROMPT,
            },
          },
        ],
      };

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AUMA MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
