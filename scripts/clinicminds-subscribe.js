require('dotenv/config');

const DEFAULT_EVENTS = ['appointment_scheduled', 'appointment_cancelled'];
const apiBaseUrl =
  process.env.CLINICMINDS_API_BASE_URL ||
  'https://app.clinicminds.com/api/triggers-actions';

async function main() {
  const apiKey = requireEnv('CLINICMINDS_API_KEY');
  const userAgent = requireEnv('CLINICMINDS_USER_AGENT');
  const callbackUrl = requireEnv('CLINICMINDS_CALLBACK_URL');
  const events = getEvents();

  console.log(`Subscribing ${callbackUrl} to Clinicminds events: ${events.join(', ')}`);

  for (const event of events) {
    const response = await fetch(`${apiBaseUrl}/subscribe/`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'user-agent': userAgent,
      },
      body: JSON.stringify({
        event,
        target_url: callbackUrl,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Failed to subscribe ${event}: ${response.status}${responseText ? `: ${responseText}` : ''}`,
      );
    }

    console.log(`Subscribed: ${event}`);
  }
}

function getEvents() {
  const configuredEvents = process.env.CLINICMINDS_EVENTS;

  if (!configuredEvents) {
    return DEFAULT_EVENTS;
  }

  return configuredEvents
    .split(',')
    .map((eventCode) => eventCode.trim())
    .filter((eventCode) => eventCode.length > 0);
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
