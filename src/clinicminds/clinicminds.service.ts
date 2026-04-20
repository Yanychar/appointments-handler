import { Injectable } from '@nestjs/common';
import {
  CLINICMINDS_API_BASE_URL,
  CLINICMINDS_DEFAULT_EVENTS,
  ClinicmindsEventCode,
} from './clinicminds.constants';

type SubscribeOptions = {
  callbackUrl?: string;
  events?: ClinicmindsEventCode[];
};

type UnsubscribeOptions = {
  callbackUrl?: string;
};

type SearchAppointmentsOptions = {
  clientIdNumber: string;
  filter?: string;
};

@Injectable()
export class ClinicmindsService {
  async subscribe(options: SubscribeOptions = {}) {
    const callbackUrl = this.getCallbackUrl(options.callbackUrl);
    const events = this.getEvents(options.events);

    return Promise.all(
      events.map((event) =>
        this.post('/subscribe/', {
          event,
          target_url: callbackUrl,
        }),
      ),
    );
  }

  async unsubscribe(options: UnsubscribeOptions = {}) {
    const callbackUrl = this.getCallbackUrl(options.callbackUrl);

    return this.post('/unsubscribe/', {
      target_url: callbackUrl,
    });
  }

  async getScheduledAppointments() {
    return this.get('/scheduled-appointments/');
  }

  async searchAppointments(options: SearchAppointmentsOptions) {
    if (!options.clientIdNumber) {
      throw new Error('clientIdNumber is required');
    }

    const searchParams = new URLSearchParams({
      client_id_number: options.clientIdNumber,
    });

    if (options.filter) {
      searchParams.set('filter', options.filter);
    }

    return this.get(`/search-appointments/?${searchParams.toString()}`);
  }

  private async post(pathname: string, payload: Record<string, string>) {
    return this.request(`${this.getApiBaseUrl()}${pathname}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.getApiKey(),
        'user-agent': this.getUserAgent(),
      },
      body: JSON.stringify(payload),
    });
  }

  private async get(pathname: string) {
    return this.request(`${this.getApiBaseUrl()}${pathname}`, {
      method: 'GET',
      headers: {
        'x-api-key': this.getApiKey(),
        'user-agent': this.getUserAgent(),
      },
    });
  }

  private async request(url: string, init: RequestInit) {
    const response = await fetch(url, init);

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Clinicminds request failed with ${response.status}${responseText ? `: ${responseText}` : ''}`,
      );
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }

  private getApiBaseUrl() {
    return process.env.CLINICMINDS_API_BASE_URL || CLINICMINDS_API_BASE_URL;
  }

  private getApiKey() {
    const apiKey = process.env.CLINICMINDS_API_KEY;

    if (!apiKey) {
      throw new Error('CLINICMINDS_API_KEY is not configured');
    }

    return apiKey;
  }

  private getUserAgent() {
    const userAgent = process.env.CLINICMINDS_USER_AGENT;

    if (!userAgent) {
      throw new Error('CLINICMINDS_USER_AGENT is not configured');
    }

    return userAgent;
  }

  private getCallbackUrl(overrideCallbackUrl?: string) {

    const callbackUrl = overrideCallbackUrl || process.env.CLINICMINDS_CALLBACK_URL;

    if (!callbackUrl) {
      throw new Error('CLINICMINDS_CALLBACK_URL is not configured');
    }

    return callbackUrl;
  }

  private getEvents(overrideEvents?: ClinicmindsEventCode[]) {
    if (overrideEvents && overrideEvents.length > 0) {
      return overrideEvents;
    }

    const configuredEvents = process.env.CLINICMINDS_EVENTS;

    if (!configuredEvents) {
      return [...CLINICMINDS_DEFAULT_EVENTS];
    }

    return configuredEvents
      .split(',')
      .map((eventCode) => eventCode.trim())
      .filter((eventCode): eventCode is ClinicmindsEventCode => eventCode.length > 0);
  }
}
