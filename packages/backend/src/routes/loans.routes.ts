// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { Router, type Router as RouterType, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ghlAuthMiddleware, type AuthenticatedRequest } from '../middleware/ghlAuth.middleware.js';
import { tenantContextMiddleware } from '../middleware/tenantContext.middleware.js';
import { supabase } from '../services/supabase.service.js';
import { ghlService } from '../services/ghl.service.js';
import { createError } from '../middleware/errorHandler.middleware.js';
import type { LoanCreateInput, LoanUpdateInput, LoanStatus, GhlPipelineStage } from '@auma/shared';

const router: RouterType = Router();

// All loan routes require authentication and tenant context
router.use(ghlAuthMiddleware);
router.use(tenantContextMiddleware);

// Create new loan
router.post('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const input: LoanCreateInput = req.body;
    const locationId = req.locationId!;

    // Generate loan number
    const loanNumber = `LN-${new Date().getFullYear()}-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create or get GHL contact
    let ghlContactId = input.ghlContactId;
    if (!ghlContactId) {
      const contact = await ghlService.createContact(locationId, {
        firstName: input.borrower.firstName,
        lastName: input.borrower.lastName,
        email: input.borrower.email,
        phone: input.borrower.phone,
      });
      ghlContactId = contact.id;
    }

    // Insert loan record
    const { data: loan, error } = await supabase
      .from('loans')
      .insert({
        id: uuidv4(),
        location_id: locationId,
        ghl_contact_id: ghlContactId,
        loan_number: loanNumber,
        status: 'lead',
        loan_purpose: input.loan.purpose,
        loan_type: input.loan.loanType,
        property_address: input.loan.propertyAddress,
        referral_source: input.referralSource,
      })
      .select()
      .single();

    if (error) {
      throw createError(`Failed to create loan: ${error.message}`, 500);
    }

    // Create borrower record
    await supabase.from('borrowers').insert({
      id: uuidv4(),
      loan_id: loan.id,
      borrower_type: 'primary',
      first_name: input.borrower.firstName,
      last_name: input.borrower.lastName,
      email: input.borrower.email,
      phone: input.borrower.phone,
    });

    // Create audit log
    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      loan_id: loan.id,
      location_id: locationId,
      action_type: 'loan_created',
      performed_by: 'human_processor',
      details: { loanNumber },
    });

    res.status(201).json({
      success: true,
      loan: {
        id: loan.id,
        loanNumber,
        status: loan.status,
        ghlContactId,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get loans list with filtering
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const locationId = req.locationId!;
    const { status, search, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('loans')
      .select('*, borrowers(*)', { count: 'exact' })
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    if (search && typeof search === 'string') {
      query = query.or(
        `loan_number.ilike.%${search}%,property_address.ilike.%${search}%`
      );
    }

    const { data: loans, error, count } = await query;

    if (error) {
      throw createError(`Failed to fetch loans: ${error.message}`, 500);
    }

    res.json({
      success: true,
      loans,
      pagination: {
        total: count,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single loan
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const locationId = req.locationId!;

    const { data: loan, error } = await supabase
      .from('loans')
      .select('*, borrowers(*), documents(*), income_calculations(*)')
      .eq('id', id)
      .eq('location_id', locationId)
      .single();

    if (error || !loan) {
      throw createError('Loan not found', 404);
    }

    res.json({ success: true, loan });
  } catch (error) {
    next(error);
  }
});

// Update loan
router.patch('/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const locationId = req.locationId!;
    const input: LoanUpdateInput = req.body;

    // Get current loan state
    const { data: currentLoan, error: fetchError } = await supabase
      .from('loans')
      .select('status, ghl_opportunity_id')
      .eq('id', id)
      .eq('location_id', locationId)
      .single();

    if (fetchError || !currentLoan) {
      throw createError('Loan not found', 404);
    }

    // Update loan
    const { data: loan, error } = await supabase
      .from('loans')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('location_id', locationId)
      .select()
      .single();

    if (error) {
      throw createError(`Failed to update loan: ${error.message}`, 500);
    }

    // If status changed, update GHL opportunity
    if (input.status && input.status !== currentLoan.status && currentLoan.ghl_opportunity_id) {
      // Get pipeline stages and find matching stage
      const pipelines = await ghlService.getPipelines(locationId);
      // Find stage matching new status
      for (const pipeline of pipelines) {
        const stage = pipeline.stages.find(
          (s: GhlPipelineStage) => s.name.toLowerCase().includes(input.status!.replace(/_/g, ' '))
        );
        if (stage) {
          await ghlService.updateOpportunityStage(
            locationId,
            currentLoan.ghl_opportunity_id,
            stage.id
          );
          break;
        }
      }

      // Create audit log for status change
      await supabase.from('audit_logs').insert({
        id: uuidv4(),
        loan_id: id,
        location_id: locationId,
        action_type: 'loan_status_changed',
        performed_by: 'human_processor',
        details: {
          previousStatus: currentLoan.status,
          newStatus: input.status,
        },
      });
    }

    res.json({ success: true, loan });
  } catch (error) {
    next(error);
  }
});

// Update loan status (convenience endpoint)
router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const locationId = req.locationId!;
    const { status } = req.body as { status: LoanStatus };

    // Get current loan state
    const { data: currentLoan, error: fetchError } = await supabase
      .from('loans')
      .select('status, ghl_opportunity_id')
      .eq('id', id)
      .eq('location_id', locationId)
      .single();

    if (fetchError || !currentLoan) {
      throw createError('Loan not found', 404);
    }

    // Update loan status
    const { data: loan, error } = await supabase
      .from('loans')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('location_id', locationId)
      .select()
      .single();

    if (error) {
      throw createError(`Failed to update loan status: ${error.message}`, 500);
    }

    // If status changed, update GHL opportunity
    if (status !== currentLoan.status && currentLoan.ghl_opportunity_id) {
      const pipelines = await ghlService.getPipelines(locationId);
      for (const pipeline of pipelines) {
        const stage = pipeline.stages.find(
          (s: GhlPipelineStage) => s.name.toLowerCase().includes(status.replace(/_/g, ' '))
        );
        if (stage) {
          await ghlService.updateOpportunityStage(
            locationId,
            currentLoan.ghl_opportunity_id,
            stage.id
          );
          break;
        }
      }

      // Create audit log for status change
      await supabase.from('audit_logs').insert({
        id: uuidv4(),
        loan_id: id,
        location_id: locationId,
        action_type: 'loan_status_changed',
        performed_by: 'human_processor',
        details: {
          previousStatus: currentLoan.status,
          newStatus: status,
        },
      });
    }

    res.json({ success: true, loan });
  } catch (error) {
    next(error);
  }
});

export { router as loanRoutes };
