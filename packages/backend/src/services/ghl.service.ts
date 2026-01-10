// Product of Launch Maniac LLC, Las Vegas, Nevada - (725) 444-8200 support@launchmaniac.com

import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { supabase } from './supabase.service.js';
import { encryptToken, decryptToken } from '../utils/encryption.js';
import type {
  GhlTokens,
  GhlContact,
  GhlOpportunity,
  GhlPipeline,
  GhlTask,
} from '@auma/shared';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

interface GhlApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown>;
  locationId: string;
}

interface GhlOAuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  locationId: string;
  companyId: string;
}

export class GhlService {
  private async getAccessToken(locationId: string): Promise<string> {
    const { data: installation, error } = await supabase
      .from('ghl_installations')
      .select('access_token_encrypted, refresh_token_encrypted, expires_at')
      .eq('location_id', locationId)
      .single();

    if (error || !installation) {
      throw new Error(`No GHL installation found for location: ${locationId}`);
    }

    const expiresAt = new Date(installation.expires_at);
    const now = new Date();

    // Refresh token if expired or expiring within 5 minutes
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      const refreshToken = decryptToken(installation.refresh_token_encrypted);
      const newTokens = await this.refreshTokens(refreshToken);
      await this.saveTokens(locationId, newTokens);
      return newTokens.accessToken;
    }

    return decryptToken(installation.access_token_encrypted);
  }

  private async refreshTokens(refreshToken: string): Promise<GhlTokens> {
    const response = await fetch(`${GHL_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.ghl.clientId,
        client_secret: config.ghl.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to refresh GHL tokens', { error });
      throw new Error('Failed to refresh GHL tokens');
    }

    const data = await response.json() as GhlOAuthResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      locationId: data.locationId,
      companyId: data.companyId,
    };
  }

  async saveTokens(locationId: string, tokens: GhlTokens): Promise<void> {
    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

    const { error } = await supabase
      .from('ghl_installations')
      .upsert({
        location_id: locationId,
        company_id: tokens.companyId,
        access_token_encrypted: encryptToken(tokens.accessToken),
        refresh_token_encrypted: encryptToken(tokens.refreshToken),
        expires_at: expiresAt.toISOString(),
        is_active: true,
      }, { onConflict: 'location_id' });

    if (error) {
      logger.error('Failed to save GHL tokens', { error });
      throw new Error('Failed to save GHL tokens');
    }
  }

  private async request<T>(
    endpoint: string,
    options: GhlApiOptions
  ): Promise<T> {
    const accessToken = await this.getAccessToken(options.locationId);

    const response = await fetch(`${GHL_API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('GHL API request failed', { endpoint, error });
      throw new Error(`GHL API request failed: ${error}`);
    }

    return response.json() as Promise<T>;
  }

  // OAuth
  async exchangeCode(code: string): Promise<GhlTokens> {
    const response = await fetch(`${GHL_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.ghl.clientId,
        client_secret: config.ghl.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.ghl.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to exchange GHL code', { error });
      throw new Error('Failed to exchange authorization code');
    }

    const data = await response.json() as GhlOAuthResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
      locationId: data.locationId,
      companyId: data.companyId,
    };
  }

  // Contacts
  async getContact(locationId: string, contactId: string): Promise<GhlContact> {
    const response = await this.request<{ contact: GhlContact }>(
      `/contacts/${contactId}`,
      { locationId }
    );
    return response.contact;
  }

  async createContact(
    locationId: string,
    data: Partial<GhlContact>
  ): Promise<GhlContact> {
    const response = await this.request<{ contact: GhlContact }>(
      '/contacts/',
      {
        method: 'POST',
        locationId,
        body: { ...data, locationId },
      }
    );
    return response.contact;
  }

  async updateContact(
    locationId: string,
    contactId: string,
    data: Partial<GhlContact>
  ): Promise<GhlContact> {
    const response = await this.request<{ contact: GhlContact }>(
      `/contacts/${contactId}`,
      {
        method: 'PUT',
        locationId,
        body: data,
      }
    );
    return response.contact;
  }

  // Opportunities (Pipeline)
  async getOpportunity(
    locationId: string,
    opportunityId: string
  ): Promise<GhlOpportunity> {
    const response = await this.request<{ opportunity: GhlOpportunity }>(
      `/opportunities/${opportunityId}`,
      { locationId }
    );
    return response.opportunity;
  }

  async createOpportunity(
    locationId: string,
    data: Partial<GhlOpportunity>
  ): Promise<GhlOpportunity> {
    const response = await this.request<{ opportunity: GhlOpportunity }>(
      '/opportunities/',
      {
        method: 'POST',
        locationId,
        body: data,
      }
    );
    return response.opportunity;
  }

  async updateOpportunityStage(
    locationId: string,
    opportunityId: string,
    stageId: string
  ): Promise<GhlOpportunity> {
    const response = await this.request<{ opportunity: GhlOpportunity }>(
      `/opportunities/${opportunityId}`,
      {
        method: 'PUT',
        locationId,
        body: { pipelineStageId: stageId },
      }
    );
    return response.opportunity;
  }

  // Pipelines
  async getPipelines(locationId: string): Promise<GhlPipeline[]> {
    const response = await this.request<{ pipelines: GhlPipeline[] }>(
      `/opportunities/pipelines?locationId=${locationId}`,
      { locationId }
    );
    return response.pipelines;
  }

  async createPipeline(
    locationId: string,
    name: string,
    stages: string[]
  ): Promise<GhlPipeline> {
    const response = await this.request<{ pipeline: GhlPipeline }>(
      '/opportunities/pipelines/',
      {
        method: 'POST',
        locationId,
        body: {
          name,
          locationId,
          stages: stages.map((stageName, index) => ({
            name: stageName,
            position: index,
          })),
        },
      }
    );
    return response.pipeline;
  }

  // Tasks
  async createTask(
    locationId: string,
    data: {
      contactId: string;
      assignedTo: string;
      title: string;
      description?: string;
      dueDate: string;
    }
  ): Promise<GhlTask> {
    const response = await this.request<{ task: GhlTask }>(
      '/contacts/tasks',
      {
        method: 'POST',
        locationId,
        body: {
          contactId: data.contactId,
          assignedTo: data.assignedTo,
          title: data.title,
          body: data.description,
          dueDate: data.dueDate,
        },
      }
    );
    return response.task;
  }

  // Messages
  async sendSms(
    locationId: string,
    contactId: string,
    message: string
  ): Promise<void> {
    await this.request('/conversations/messages', {
      method: 'POST',
      locationId,
      body: {
        type: 'SMS',
        contactId,
        message,
      },
    });
  }

  async sendEmail(
    locationId: string,
    contactId: string,
    options: { subject: string; html: string; text?: string }
  ): Promise<void> {
    await this.request('/conversations/messages', {
      method: 'POST',
      locationId,
      body: {
        type: 'Email',
        contactId,
        subject: options.subject,
        html: options.html,
        message: options.text || options.html,
      },
    });
  }
}

export const ghlService = new GhlService();
