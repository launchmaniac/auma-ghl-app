// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { config } from '../config/env.js';
import { ghlService } from './ghl.service.js';
import { supabase } from './supabase.service.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

interface MloContext {
  mloUserId: string;
  mloName: string;
  mloEmail: string;
  mloPhone: string;
  mloNmls: string;
}

interface LoanContext {
  loanId: string;
  loanNumber: string;
  locationId: string;
  borrowerName: string;
  ghlContactId: string;
}

interface EscalationContext extends MloContext, LoanContext {
  reason: string;
  details?: Record<string, unknown>;
}

class NotificationService {
  private smtp2goApiKey: string;
  private smtp2goSender: string;

  constructor() {
    this.smtp2goApiKey = config.smtp2goApiKey;
    this.smtp2goSender = config.smtp2goSender;
  }

  /**
   * Notify MLO through all available channels
   * Channel 1: GHL Native Task
   * Channel 2: External SMS via SMTP2Go
   * Channel 3: External Email via SMTP2Go
   */
  async notifyMlo(context: EscalationContext): Promise<void> {
    const results: { channel: string; success: boolean; error?: string }[] = [];

    // Channel 1: GHL Native Task
    try {
      await this.createGhlTask(context);
      results.push({ channel: 'ghl_task', success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to create GHL task', { context, error: errorMessage });
      results.push({ channel: 'ghl_task', success: false, error: errorMessage });
    }

    // Channel 2: External SMS
    try {
      await this.sendExternalSms(context);
      results.push({ channel: 'sms', success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send external SMS', { context, error: errorMessage });
      results.push({ channel: 'sms', success: false, error: errorMessage });
    }

    // Channel 3: External Email
    try {
      await this.sendExternalEmail(context);
      results.push({ channel: 'email', success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send external email', { context, error: errorMessage });
      results.push({ channel: 'email', success: false, error: errorMessage });
    }

    // Log notification attempt
    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      loan_id: context.loanId,
      location_id: context.locationId,
      action_type: 'mlo_notification_sent',
      performed_by: 'ai_assistant',
      details: {
        reason: context.reason,
        channels: results,
        mloId: context.mloUserId,
      },
    });

    // Check if all channels failed
    const allFailed = results.every(r => !r.success);
    if (allFailed) {
      logger.error('All MLO notification channels failed', { context, results });
      // Could trigger a backup notification system here
    }
  }

  /**
   * Send Step 4 handoff notification (Notes to LO stage)
   */
  async sendHandoffNotification(
    context: LoanContext,
    mloContext: MloContext,
    notes: string,
    calculatedIncome: number
  ): Promise<void> {
    await this.notifyMlo({
      ...context,
      ...mloContext,
      reason: 'File Ready for MLO Review (Step 4)',
      details: {
        notes,
        calculatedIncome,
        stage: 'notes_to_lo',
      },
    });
  }

  /**
   * Send SAFE Act escalation notification
   */
  async sendSafeActEscalation(
    context: LoanContext,
    mloContext: MloContext,
    originalMessage: string,
    flaggedKeywords: string[]
  ): Promise<void> {
    await this.notifyMlo({
      ...context,
      ...mloContext,
      reason: 'SAFE Act Escalation - Rate/Advice Question',
      details: {
        originalMessage,
        flaggedKeywords,
        urgency: 'high',
        responseTimeRequired: '2 hours',
      },
    });
  }

  /**
   * Send condition request notification
   */
  async sendConditionNotification(
    context: LoanContext,
    mloContext: MloContext,
    conditionType: string,
    description: string
  ): Promise<void> {
    await this.notifyMlo({
      ...context,
      ...mloContext,
      reason: `New Condition: ${conditionType}`,
      details: {
        conditionType,
        description,
      },
    });
  }

  /**
   * Send document review notification
   */
  async sendDocumentReviewNotification(
    context: LoanContext,
    mloContext: MloContext,
    documentType: string,
    issues: string[]
  ): Promise<void> {
    await this.notifyMlo({
      ...context,
      ...mloContext,
      reason: 'Document Requires Review',
      details: {
        documentType,
        issues,
      },
    });
  }

  private async createGhlTask(context: EscalationContext): Promise<void> {
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + 2); // 2-hour SLA

    await ghlService.createTask(context.locationId, {
      contactId: context.ghlContactId,
      assignedTo: context.mloUserId,
      title: `[AUMA] ${context.reason} - ${context.borrowerName}`,
      description: this.formatTaskDescription(context),
      dueDate: dueDate.toISOString(),
    });
  }

  private async sendExternalSms(context: EscalationContext): Promise<void> {
    if (!context.mloPhone) {
      logger.warn('No MLO phone number for SMS notification', { mloUserId: context.mloUserId });
      return;
    }

    const message = `AUMA Alert: ${context.reason}\n\nBorrower: ${context.borrowerName}\nLoan: ${context.loanNumber}\n\nPlease review in GHL within 2 hours.`;

    await this.sendSmtp2goSms(context.mloPhone, message);
  }

  private async sendExternalEmail(context: EscalationContext): Promise<void> {
    if (!context.mloEmail) {
      logger.warn('No MLO email for notification', { mloUserId: context.mloUserId });
      return;
    }

    const html = this.formatEmailHtml(context);

    await this.sendSmtp2goEmail({
      to: context.mloEmail,
      subject: `[AUMA] Action Required: ${context.borrowerName} - ${context.reason}`,
      html,
    });
  }

  private async sendSmtp2goSms(to: string, message: string): Promise<void> {
    const response = await fetch('https://api.smtp2go.com/v3/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': this.smtp2goApiKey,
      },
      body: JSON.stringify({
        sender: 'AUMA',
        to: [to],
        message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SMTP2Go SMS error: ${response.status} - ${error}`);
    }

    logger.info('External SMS sent successfully', { to: to.slice(-4) });
  }

  private async sendSmtp2goEmail(options: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    const response = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Smtp2go-Api-Key': this.smtp2goApiKey,
      },
      body: JSON.stringify({
        api_key: this.smtp2goApiKey,
        sender: this.smtp2goSender,
        to: [options.to],
        subject: options.subject,
        html_body: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SMTP2Go email error: ${response.status} - ${error}`);
    }

    logger.info('External email sent successfully', { to: options.to });
  }

  private formatTaskDescription(context: EscalationContext): string {
    let description = `**Borrower:** ${context.borrowerName}\n`;
    description += `**Loan Number:** ${context.loanNumber}\n`;
    description += `**Reason:** ${context.reason}\n\n`;

    if (context.details) {
      description += '**Details:**\n';
      for (const [key, value] of Object.entries(context.details)) {
        if (typeof value === 'object') {
          description += `- ${key}: ${JSON.stringify(value)}\n`;
        } else {
          description += `- ${key}: ${value}\n`;
        }
      }
    }

    description += '\n---\nGenerated by AUMA AI Assistant';
    return description;
  }

  private formatEmailHtml(context: EscalationContext): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1976d2; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .alert-box { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
    .details { background: white; padding: 15px; border: 1px solid #ddd; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .cta-button { display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AUMA Alert</h1>
    </div>
    <div class="content">
      <div class="alert-box">
        <strong>Action Required:</strong> ${context.reason}
      </div>

      <div class="details">
        <p><strong>Borrower:</strong> ${context.borrowerName}</p>
        <p><strong>Loan Number:</strong> ${context.loanNumber}</p>
        <p><strong>Response Required:</strong> Within 2 hours</p>
      </div>

      ${context.details ? `
      <div class="details">
        <h3>Details</h3>
        ${Object.entries(context.details)
          .map(([key, value]) => {
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
            return `<p><strong>${key}:</strong> ${displayValue}</p>`;
          })
          .join('')}
      </div>
      ` : ''}

      <p style="text-align: center;">
        <a href="https://app.gohighlevel.com" class="cta-button">Open in GHL</a>
      </p>
    </div>
    <div class="footer">
      <p>This notification was generated by AUMA AI Assistant</p>
      <p>Product of Launch Maniac LLC, Las Vegas, Nevada</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

// Helper function to get MLO context for a loan
export async function getMloContextForLoan(
  loanId: string
): Promise<MloContext | null> {
  const { data: loan, error } = await supabase
    .from('loans')
    .select(`
      assigned_mlo_id,
      mlo_users!inner(
        id,
        first_name,
        last_name,
        email,
        phone,
        nmls_number
      )
    `)
    .eq('id', loanId)
    .single();

  if (error || !loan || !loan.mlo_users) {
    logger.warn('No MLO assigned to loan', { loanId });
    return null;
  }

  // mlo_users comes as an array from the join, get the first element
  const mloData = loan.mlo_users as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    nmls_number: string;
  } | Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    nmls_number: string;
  }>;

  const mlo = Array.isArray(mloData) ? mloData[0] : mloData;

  if (!mlo) {
    logger.warn('No MLO data found for loan', { loanId });
    return null;
  }

  return {
    mloUserId: mlo.id,
    mloName: `${mlo.first_name} ${mlo.last_name}`,
    mloEmail: mlo.email,
    mloPhone: mlo.phone,
    mloNmls: mlo.nmls_number,
  };
}

export const notificationService = new NotificationService();
