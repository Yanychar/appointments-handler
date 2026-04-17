import { ClinicmindsService } from './clinicminds.service';

describe('ClinicmindsService', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      CLINICMINDS_API_KEY: 'test-key',
      CLINICMINDS_USER_AGENT: 'AppointmentsHandler/1.0 (+dev@example.test)',
      CLINICMINDS_CALLBACK_URL: 'https://example.test/cm-webhook',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('subscribes the configured events for the configured callback URL', async () => {
    const service = new ClinicmindsService();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
      json: jest.fn().mockResolvedValue({ ok: true }),
      text: jest.fn(),
    });

    global.fetch = fetchMock as typeof fetch;

    await service.subscribe();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://app.clinicminds.com/api/triggers-actions/subscribe/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-key',
          'user-agent': 'AppointmentsHandler/1.0 (+dev@example.test)',
        }),
        body: JSON.stringify({
          event: 'appointment_scheduled',
          target_url: 'https://example.test/cm-webhook',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://app.clinicminds.com/api/triggers-actions/subscribe/',
      expect.objectContaining({
        body: JSON.stringify({
          event: 'appointment_cancelled',
          target_url: 'https://example.test/cm-webhook',
        }),
      }),
    );
  });

  it('unsubscribes the configured callback URL', async () => {
    const service = new ClinicmindsService();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('text/plain'),
      },
      text: jest.fn().mockResolvedValue('ok'),
    });

    global.fetch = fetchMock as typeof fetch;

    await service.unsubscribe();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.clinicminds.com/api/triggers-actions/unsubscribe/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          target_url: 'https://example.test/cm-webhook',
        }),
      }),
    );
  });
});
