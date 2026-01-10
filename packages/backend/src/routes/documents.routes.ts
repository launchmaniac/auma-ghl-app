// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { Router, type Router as RouterType, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { ghlAuthMiddleware, type AuthenticatedRequest } from '../middleware/ghlAuth.middleware.js';
import { tenantContextMiddleware } from '../middleware/tenantContext.middleware.js';
import { supabase } from '../services/supabase.service.js';
import { deepseekService } from '../services/deepseek.service.js';
import { createError } from '../middleware/errorHandler.middleware.js';
import { logger } from '../utils/logger.js';
import type { DocumentType } from '@auma/shared';

const router: RouterType = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, PNG, and TIFF are allowed.'));
    }
  },
});

// All document routes require authentication and tenant context
router.use(ghlAuthMiddleware);
router.use(tenantContextMiddleware);

// Upload document
router.post(
  '/loans/:loanId/upload',
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { loanId } = req.params;
      const locationId = req.locationId!;
      const { documentType, borrowerId } = req.body as {
        documentType: DocumentType;
        borrowerId?: string;
      };

      if (!req.file) {
        throw createError('No file uploaded', 400);
      }

      // Verify loan exists and belongs to this location
      const { data: loan, error: loanError } = await supabase
        .from('loans')
        .select('id')
        .eq('id', loanId)
        .eq('location_id', locationId)
        .single();

      if (loanError || !loan) {
        throw createError('Loan not found', 404);
      }

      // Generate file checksum
      const checksum = crypto
        .createHash('sha256')
        .update(req.file.buffer)
        .digest('hex');

      // Store file in Supabase Storage
      const fileId = uuidv4();
      const filePath = `${locationId}/${loanId}/${fileId}-${req.file.originalname}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        throw createError(`Failed to upload file: ${uploadError.message}`, 500);
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
          uploaded_by: req.userId || 'system',
          upload_source: 'processor_upload',
        })
        .select()
        .single();

      if (docError) {
        throw createError(`Failed to create document record: ${docError.message}`, 500);
      }

      // Start async OCR processing
      processDocumentOcr(fileId, req.file.buffer, documentType, locationId, loanId).catch(
        (error) => logger.error('OCR processing failed', { error, documentId: fileId })
      );

      // Create audit log
      await supabase.from('audit_logs').insert({
        id: uuidv4(),
        loan_id: loanId,
        location_id: locationId,
        action_type: 'document_uploaded',
        performed_by: 'human_processor',
        details: {
          documentId: fileId,
          documentType,
          fileName: req.file.originalname,
        },
      });

      res.status(201).json({
        success: true,
        document: {
          id: document.id,
          documentType: document.document_type,
          fileName: document.original_file_name,
          ocrStatus: document.ocr_status,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get documents for a loan
router.get('/loans/:loanId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { loanId } = req.params;
    const locationId = req.locationId!;

    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('loan_id', loanId)
      .order('created_at', { ascending: false });

    if (error) {
      throw createError(`Failed to fetch documents: ${error.message}`, 500);
    }

    res.json({ success: true, documents });
  } catch (error) {
    next(error);
  }
});

// Get single document with OCR data
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !document) {
      throw createError('Document not found', 404);
    }

    res.json({ success: true, document });
  } catch (error) {
    next(error);
  }
});

// Download document
router.get('/:id/download', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const { data: document, error } = await supabase
      .from('documents')
      .select('file_path, original_file_name, mime_type')
      .eq('id', id)
      .single();

    if (error || !document) {
      throw createError('Document not found', 404);
    }

    // Get signed URL for download
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, 3600); // 1 hour expiry

    if (urlError || !signedUrl) {
      throw createError('Failed to generate download URL', 500);
    }

    res.json({
      success: true,
      downloadUrl: signedUrl.signedUrl,
      fileName: document.original_file_name,
      mimeType: document.mime_type,
    });
  } catch (error) {
    next(error);
  }
});

// Reprocess document OCR
router.post('/:id/reprocess', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const locationId = req.locationId!;

    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !document) {
      throw createError('Document not found', 404);
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw createError('Failed to download document for reprocessing', 500);
    }

    // Update status to processing
    await supabase
      .from('documents')
      .update({ ocr_status: 'pending' })
      .eq('id', id);

    // Reprocess
    const buffer = Buffer.from(await fileData.arrayBuffer());
    processDocumentOcr(id, buffer, document.document_type, locationId, document.loan_id).catch(
      (error) => logger.error('OCR reprocessing failed', { error, documentId: id })
    );

    res.json({ success: true, message: 'Document reprocessing started' });
  } catch (error) {
    next(error);
  }
});

// Helper to determine document category
function getDocumentCategory(type: DocumentType): string {
  const categories: Record<string, string[]> = {
    income: ['paystub', 'w2', 'tax_return_1040', 'tax_return_1120', 'tax_return_1065', 'schedule_c', 'schedule_e', 'k1'],
    asset: ['bank_statement', 'investment_statement', 'retirement_statement'],
    identity: ['drivers_license', 'passport', 'social_security_card'],
    property: ['purchase_agreement', 'appraisal', 'title_commitment', 'homeowners_insurance', 'survey'],
    legal: [],
  };

  for (const [category, types] of Object.entries(categories)) {
    if (types.includes(type)) {
      return category;
    }
  }
  return 'other';
}

// Async OCR processing function
async function processDocumentOcr(
  documentId: string,
  fileBuffer: Buffer,
  documentType: DocumentType,
  locationId: string,
  loanId: string
) {
  try {
    // Update status to processing
    await supabase
      .from('documents')
      .update({ ocr_status: 'processing' })
      .eq('id', documentId);

    // Process with Deepseek
    const ocrResult = await deepseekService.processDocument(fileBuffer, documentType);

    // Update document with OCR results
    await supabase
      .from('documents')
      .update({
        ocr_status: 'completed',
        ocr_confidence_score: ocrResult.confidence,
        ocr_data: ocrResult.extractedFields,
        validation_status: ocrResult.confidence > 0.9 ? 'valid' : 'needs_review',
      })
      .eq('id', documentId);

    // Create audit log
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
        extractedFields: Object.keys(ocrResult.extractedFields || {}),
      },
    });

    logger.info('Document OCR completed', { documentId, confidence: ocrResult.confidence });
  } catch (error) {
    logger.error('Document OCR failed', { documentId, error });

    await supabase
      .from('documents')
      .update({
        ocr_status: 'failed',
        validation_errors: [{ field: 'ocr', message: 'OCR processing failed', severity: 'error' }],
      })
      .eq('id', documentId);
  }
}

export { router as documentRoutes };
