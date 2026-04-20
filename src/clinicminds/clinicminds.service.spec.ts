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

  it('fetches scheduled appointments for the scheduled appointments trigger endpoint', async () => {
    const service = new ClinicmindsService();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
      json: jest.fn().mockResolvedValue([{ id: 'apt_1' }]),
      text: jest.fn(),
    });

    global.fetch = fetchMock as typeof fetch;

    await service.getScheduledAppointments();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.clinicminds.com/api/triggers-actions/scheduled-appointments/',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-api-key': 'test-key',
          'user-agent': 'AppointmentsHandler/1.0 (+dev@example.test)',
        }),
      }),
    );
  });

  it('searches appointments by patient id number and filter', async () => {
    const service = new ClinicmindsService();
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: jest.fn().mockReturnValue('application/json'),
      },
      json: jest.fn().mockResolvedValue([{ id: 'apt_2' }]),
      text: jest.fn(),
    });

    global.fetch = fetchMock as typeof fetch;

    await service.searchAppointments({
      clientIdNumber: '123-4567',
      filter: 'future',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://app.clinicminds.com/api/triggers-actions/search-appointments/?client_id_number=123-4567&filter=future',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'x-api-key': 'test-key',
          'user-agent': 'AppointmentsHandler/1.0 (+dev@example.test)',
        }),
      }),
    );
  });
});
