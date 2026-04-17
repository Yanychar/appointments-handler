require('dotenv/config');

const apiBaseUrl =
  process.env.CLINICMINDS_API_BASE_URL ||
  'https://app.clinicminds.com/api/triggers-actions';

async function main() {
  const apiKey = requireEnv('CLINICMINDS_API_KEY');
  const userAgent = requireEnv('CLINICMINDS_USER_AGENT');
  const callbackUrl = requireEnv('CLINICMINDS_CALLBACK_URL');

  console.log(`Unsubscribing ${callbackUrl} from Clinicminds triggers`);

  const response = await fetch(`${apiBaseUrl}/unsubscribe/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'user-agent': userAgent,
    },
    body: JSON.stringify({
      target_url: callbackUrl,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to unsubscribe callback URL: ${response.status}${responseText ? `: ${responseText}` : ''}`,
    );
  }

  console.log('Unsubscribed successfully.');
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
