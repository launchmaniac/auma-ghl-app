// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { Router, type Router as RouterType, type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.js';
import { supabase } from '../services/supabase.service.js';
import { ghlService } from '../services/ghl.service.js';
import { deepseekService } from '../services/deepseek.service.js';
import { createError } from '../middleware/errorHandler.middleware.js';
import { logger } from '../utils/logger.js';
import type { DocumentType } from '@auma/shared';
import multer from 'multer';

const router: RouterType = Router();

// Configure multer for portal file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Portal token payload interface
interface PortalTokenPayload {
  borrowerId: string;
  loanId: string;
  locationId: string;
  email: string;
  exp?: number;
}

// Portal authentication middleware
async function portalAuthMiddleware(
  req: Request & { portal?: PortalTokenPayload },
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Missing portal token', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwtSecret) as PortalTokenPayload;

    // Verify borrower still exists and is active
    const { data: borrower, error } = await supabase
      .from('borrowers')
      .select('id, loan_id')
      .eq('id', decoded.borrowerId)
      .eq('loan_id', decoded.loanId)
      .single();

    if (error || !borrower) {
      throw createError('Invalid portal session', 401);
    }

    req.portal = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(createError('Portal session expired', 401));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid portal token', 401));
    } else {
      next(error);
    }
  }
}

// Generate magic link for borrower portal access
router.post('/magic-link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, loanNumber, locationId } = req.body as {
      email: string;
      loanNumber: string;
      locationId: string;
    };

    // Find borrower by email and loan number
    const { data: borrower, error } = await supabase
      .from('borrowers')
      .select('id, loan_id, email, first_name, loans!inner(loan_number, location_id)')
      .eq('email', email)
      .eq('loans.loan_number', loanNumber)
      .eq('loans.location_id', locationId)
      .single();

    if (error || !borrower) {
      // Don't reveal if borrower exists or not
      logger.info('Magic link requested for unknown borrower', { email, loanNumber });
      res.json({ success: true, message: 'If an account exists, a magic link has been sent.' });
      return;
    }

    // Generate portal token (24-hour expiry)
    const portalToken = jwt.sign(
      {
        borrowerId: borrower.id,
        loanId: borrower.loan_id,
        locationId,
        email: borrower.email,
      },
      config.jwtSecret,
      { expiresIn: '24h' }
    );

    // Get tenant branding for portal URL
    const { data: branding } = await supabase
      .from('tenant_branding')
      .select('subdomain_slug, custom_domain, tier')
      .eq('location_id', locationId)
      .single();

    // Build portal URL based on branding tier
    let portalBaseUrl = config.portalUrl;
    if (branding?.custom_domain && branding.tier === 'enterprise') {
      portalBaseUrl = `https://${branding.custom_domain}`;
    } else if (branding?.subdomain_slug && branding.tier === 'professional') {
      portalBaseUrl = `https://portal-${branding.subdomain_slug}.launchmaniac.com`;
    }

    const magicLink = `${portalBaseUrl}/auth?token=${portalToken}`;

    // Send magic link via GHL SMS and email
    try {
      await ghlService.sendSms(locationId, borrower.email,
        `Your loan portal access link: ${magicLink}\n\nThis link expires in 24 hours.`
      );
    } catch (smsError) {
      logger.warn('Failed to send portal SMS', { borrowerId: borrower.id, error: smsError });
    }

    try {
      await ghlService.sendEmail(locationId, borrower.email, {
        subject: 'Your Loan Portal Access Link',
        html: `
          <p>Hello ${borrower.first_name},</p>
          <p>Click the link below to access your loan portal:</p>
          <p><a href="${magicLink}">Access My Loan Portal</a></p>
          <p>This link expires in 24 hours.</p>
          <p>If you didn't request this link, please ignore this email.</p>
        `,
      });
    } catch (emailError) {
      logger.warn('Failed to send portal email', { borrowerId: borrower.id, error: emailError });
    }

    // Log the access request
    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      loan_id: borrower.loan_id,
      location_id: locationId,
      action_type: 'portal_access_requested',
      performed_by: 'borrower',
      details: { email },
    });

    res.json({ success: true, message: 'If an account exists, a magic link has been sent.' });
  } catch (error) {
    next(error);
  }
});

// Verify magic link token and return session
router.post('/verify-token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body as { token: string };

    const decoded = jwt.verify(token, config.jwtSecret) as PortalTokenPayload;

    // Get borrower details
    const { data: borrower, error } = await supabase
      .from('borrowers')
      .select('id, first_name, last_name, email, phone')
      .eq('id', decoded.borrowerId)
      .single();

    if (error || !borrower) {
      throw createError('Invalid token', 401);
    }

    // Get branding for the location
    const { data: branding } = await supabase
      .from('tenant_branding')
      .select('company_name, logo_url, primary_color, secondary_color')
      .eq('location_id', decoded.locationId)
      .single();

    res.json({
      success: true,
      session: {
        token,
        borrower: {
          id: borrower.id,
          firstName: borrower.first_name,
          lastName: borrower.last_name,
          email: borrower.email,
        },
        loanId: decoded.loanId,
        branding,
      },
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(createError('Token expired', 401));
    } else {
      next(error);
    }
  }
});

// All routes below require portal authentication
router.use(portalAuthMiddleware);

// Get loan progress and status
router.get(
  '/loan',
  async (req: Request & { portal?: PortalTokenPayload }, res: Response, next: NextFunction) => {
    try {
      const { loanId, locationId } = req.portal!;

      const { data: loan, error } = await supabase
        .from('loans')
        .select(`
          id,
          loan_number,
          status,
          loan_purpose,
          loan_type,
          property_address,
          estimated_close_date,
          created_at,
          updated_at
        `)
        .eq('id', loanId)
        .eq('location_id', locationId)
        .single();

      if (error || !loan) {
        throw createError('Loan not found', 404);
      }

      // Get loan progress milestones
      const milestones = getLoanMilestones(loan.status);

      res.json({
        success: true,
        loan: {
          loanNumber: loan.loan_number,
          status: loan.status,
          statusLabel: getStatusLabel(loan.status),
          purpose: loan.loan_purpose,
          type: loan.loan_type,
          propertyAddress: loan.property_address,
          estimatedCloseDate: loan.estimated_close_date,
          milestones,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get borrower profile
router.get(
  '/profile',
  async (req: Request & { portal?: PortalTokenPayload }, res: Response, next: NextFunction) => {
    try {
      const { borrowerId } = req.portal!;

      const { data: borrower, error } = await supabase
        .from('borrowers')
        .select('*')
        .eq('id', borrowerId)
        .single();

      if (error || !borrower) {
        throw createError('Borrower not found', 404);
      }

      res.json({
        success: true,
        profile: {
          firstName: borrower.first_name,
          lastName: borrower.last_name,
          email: borrower.email,
          phone: borrower.phone,
          dateOfBirth: borrower.date_of_birth,
          ssn: borrower.ssn_last_four ? `***-**-${borrower.ssn_last_four}` : null,
          currentAddress: borrower.current_address,
          employerName: borrower.employer_name,
          employerPhone: borrower.employer_phone,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get documents list
router.get(
  '/documents',
  async (req: Request & { portal?: PortalTokenPayload }, res: Response, next: NextFunction) => {
    try {
      const { loanId, borrowerId } = req.portal!;

      const { data: documents, error } = await supabase
        .from('documents')
        .select('id, document_type, original_file_name, ocr_status, validation_status, created_at')
        .eq('loan_id', loanId)
        .or(`borrower_id.eq.${borrowerId},borrower_id.is.null`)
        .order('created_at', { ascending: false });

      if (error) {
        throw createError('Failed to fetch documents', 500);
      }

      res.json({
        success: true,
        documents: documents.map(doc => ({
          id: doc.id,
          type: doc.document_type,
          fileName: doc.original_file_name,
          status: doc.ocr_status,
          validationStatus: doc.validation_status,
          uploadedAt: doc.created_at,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Upload document from portal
router.post(
  '/documents/upload',
  upload.single('file'),
  async (req: Request & { portal?: PortalTokenPayload }, res: Response, next: NextFunction) => {
    try {
      const { loanId, borrowerId, locationId } = req.portal!;
      const { documentType } = req.body as { documentType: DocumentType };

      if (!req.file) {
        throw createError('No file uploaded', 400);
      }

      // Generate checksum
      const checksum = crypto
        .createHash('sha256')
        .update(req.file.buffer)
        .digest('hex');

      // Store in Supabase Storage
      const fileId = uuidv4();
      const filePath = `${locationId}/${loanId}/${fileId}-${req.file.originalname}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        throw createError('Failed to upload file', 500);
      }

      // Create document record
      const { data: document, error: docError } = await supabase
        .from('documents')
        .insert({
          id: fileId,
          loan_id: loanId,
          borrower_id: borrowerId,
          document_type: documentType,
          document_category: getDocumentCategory(documentType),
          original_file_name: req.file.originalname,
          file_path: filePath,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          checksum,
          ocr_status: 'pending',
          validation_status: 'pending',
          uploaded_by: borrowerId,
          upload_source: 'borrower_portal',
        })
        .select()
        .single();

      if (docError) {
        throw createError('Failed to create document record', 500);
      }

      // Start async OCR processing
      processPortalDocument(fileId, req.file.buffer, documentType, locationId, loanId).catch(
        (error) => logger.error('Portal document OCR failed', { error, documentId: fileId })
      );

      // Log the upload
      await supabase.from('audit_logs').insert({
        id: uuidv4(),
        loan_id: loanId,
        location_id: locationId,
        action_type: 'document_uploaded',
        performed_by: 'borrower',
        details: {
          documentId: fileId,
          documentType,
          fileName: req.file.originalname,
          source: 'portal',
        },
      });

      res.status(201).json({
        success: true,
        document: {
          id: document.id,
          type: document.document_type,
          fileName: document.original_file_name,
          status: 'pending',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get outstanding conditions
router.get(
  '/conditions',
  async (req: Request & { portal?: PortalTokenPayload }, res: Response, next: NextFunction) => {
    try {
      const { loanId } = req.portal!;

      const { data: conditions, error } = await supabase
        .from('loan_conditions')
        .select('id, condition_type, description, status, due_date, created_at')
        .eq('loan_id', loanId)
        .eq('borrower_visible', true)
        .order('due_date', { ascending: true });

      if (error) {
        throw createError('Failed to fetch conditions', 500);
      }

      res.json({
        success: true,
        conditions: conditions.map(c => ({
          id: c.id,
          type: c.condition_type,
          description: c.description,
          status: c.status,
          dueDate: c.due_date,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Send message (with SAFE Act compliance check)
router.post(
  '/messages',
  async (req: Request & { portal?: PortalTokenPayload }, res: Response, next: NextFunction) => {
    try {
      const { loanId, borrowerId, locationId } = req.portal!;
      const { message } = req.body as { message: string };

      if (!message || message.trim().length === 0) {
        throw createError('Message cannot be empty', 400);
      }

      // Check SAFE Act compliance
      const complianceCheck = await deepseekService.checkCompliance(message, {
        borrowerName: 'Borrower',
        loanId,
      });

      if (complianceCheck.blocked) {
        // Store the blocked message for audit
        await supabase.from('portal_messages').insert({
          id: uuidv4(),
          loan_id: loanId,
          borrower_id: borrowerId,
          message_text: message,
          direction: 'inbound',
          blocked: true,
          block_reason: complianceCheck.escalationReason,
        });

        // Create escalation
        await supabase.from('escalations').insert({
          id: uuidv4(),
          loan_id: loanId,
          location_id: locationId,
          escalation_type: 'safe_act_violation',
          reason: complianceCheck.escalationReason,
          details: {
            originalMessage: message,
            flaggedKeywords: complianceCheck.flaggedKeywords,
          },
          status: 'pending',
        });

        // Log compliance event
        await supabase.from('audit_logs').insert({
          id: uuidv4(),
          loan_id: loanId,
          location_id: locationId,
          action_type: 'safe_act_escalation',
          performed_by: 'ai_assistant',
          details: {
            reason: complianceCheck.escalationReason,
            keywords: complianceCheck.flaggedKeywords,
          },
        });

        res.json({
          success: true,
          response: complianceCheck.suggestedResponse,
          escalated: true,
        });
        return;
      }

      // Store the message
      await supabase.from('portal_messages').insert({
        id: uuidv4(),
        loan_id: loanId,
        borrower_id: borrowerId,
        message_text: message,
        direction: 'inbound',
        blocked: false,
      });

      // Generate AI response for allowed topics
      // This would be expanded based on what topics are allowed
      res.json({
        success: true,
        response: 'Thank you for your message. A team member will review and respond shortly.',
        escalated: false,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get message history
router.get(
  '/messages',
  async (req: Request & { portal?: PortalTokenPayload }, res: Response, next: NextFunction) => {
    try {
      const { loanId, borrowerId } = req.portal!;

      const { data: messages, error } = await supabase
        .from('portal_messages')
        .select('id, message_text, direction, created_at')
        .eq('loan_id', loanId)
        .eq('borrower_id', borrowerId)
        .eq('blocked', false)
        .order('created_at', { ascending: true });

      if (error) {
        throw createError('Failed to fetch messages', 500);
      }

      res.json({
        success: true,
        messages: messages.map(m => ({
          id: m.id,
          text: m.message_text,
          direction: m.direction,
          timestamp: m.created_at,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Helper functions
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    lead: 'Application Started',
    initial_call: 'Initial Consultation',
    app_in: 'Application Received',
    post_app_call: 'Application Review',
    notes_to_lo: 'With Loan Officer',
    pre_approval_prep: 'Pre-Approval in Progress',
    in_contract: 'In Contract',
    pipeline_mgmt: 'Processing',
    final_approval: 'Final Approval',
    post_closing: 'Closed',
    denied: 'Application Declined',
  };
  return labels[status] || status;
}

function getLoanMilestones(currentStatus: string): Array<{
  step: number;
  label: string;
  status: 'completed' | 'current' | 'pending';
}> {
  const steps = [
    { step: 1, status: 'lead', label: 'Application Started' },
    { step: 2, status: 'app_in', label: 'Application Submitted' },
    { step: 3, status: 'pre_approval_prep', label: 'Pre-Approval' },
    { step: 4, status: 'in_contract', label: 'In Contract' },
    { step: 5, status: 'pipeline_mgmt', label: 'Processing' },
    { step: 6, status: 'final_approval', label: 'Final Approval' },
    { step: 7, status: 'post_closing', label: 'Closed' },
  ];

  const statusOrder = [
    'lead', 'initial_call', 'app_in', 'post_app_call', 'notes_to_lo',
    'pre_approval_prep', 'in_contract', 'pipeline_mgmt', 'final_approval', 'post_closing',
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);

  return steps.map(step => {
    const stepIndex = statusOrder.indexOf(step.status);
    let milestoneStatus: 'completed' | 'current' | 'pending';

    if (currentStatus === 'denied') {
      milestoneStatus = 'pending';
    } else if (stepIndex < currentIndex) {
      milestoneStatus = 'completed';
    } else if (stepIndex === currentIndex ||
               (currentIndex > statusOrder.indexOf(step.status) &&
                currentIndex < statusOrder.indexOf(steps[steps.indexOf(step) + 1]?.status || 'post_closing'))) {
      milestoneStatus = 'current';
    } else {
      milestoneStatus = 'pending';
    }

    return {
      step: step.step,
      label: step.label,
      status: milestoneStatus,
    };
  });
}

function getDocumentCategory(type: DocumentType): string {
  const categories: Record<string, string[]> = {
    income: ['paystub', 'w2', 'tax_return_1040', 'tax_return_1120', 'tax_return_1065', 'schedule_c', 'schedule_e', 'k1'],
    asset: ['bank_statement', 'investment_statement', 'retirement_statement'],
    identity: ['drivers_license', 'passport', 'social_security_card'],
    property: ['purchase_agreement', 'appraisal', 'title_commitment', 'homeowners_insurance', 'survey'],
  };

  for (const [category, types] of Object.entries(categories)) {
    if (types.includes(type)) {
      return category;
    }
  }
  return 'other';
}

// Async document processing for portal uploads
async function processPortalDocument(
  documentId: string,
  fileBuffer: Buffer,
  documentType: DocumentType,
  locationId: string,
  loanId: string
) {
  try {
    await supabase
      .from('documents')
      .update({ ocr_status: 'processing' })
      .eq('id', documentId);

    const ocrResult = await deepseekService.processDocument(fileBuffer, documentType);

    await supabase
      .from('documents')
      .update({
        ocr_status: 'completed',
        ocr_confidence_score: ocrResult.confidence,
        ocr_data: ocrResult.extractedFields,
        validation_status: ocrResult.confidence > 0.9 ? 'valid' : 'needs_review',
      })
      .eq('id', documentId);

    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      loan_id: loanId,
      location_id: locationId,
      action_type: 'document_processed',
      performed_by: 'ai_assistant',
      ai_confidence: ocrResult.confidence,
      details: {
        documentId,
        documentType,
        source: 'portal',
      },
    });

    logger.info('Portal document processed', { documentId, confidence: ocrResult.confidence });
  } catch (error) {
    logger.error('Portal document processing failed', { documentId, error });

    await supabase
      .from('documents')
      .update({
        ocr_status: 'failed',
        validation_errors: [{ field: 'ocr', message: 'Processing failed', severity: 'error' }],
      })
      .eq('id', documentId);
  }
}

export { router as portalRoutes };
