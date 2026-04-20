require('dotenv/config');

const apiBaseUrl =
  process.env.CLINICMINDS_API_BASE_URL ||
  'https://app.clinicminds.com/api/triggers-actions';

async function main() {
  const apiKey = requireEnv('CLINICMINDS_API_KEY');
  const userAgent = requireEnv('CLINICMINDS_USER_AGENT');

  console.log('Fetching Clinicminds scheduled appointments trigger data');

  const response = await fetch(`${apiBaseUrl}/scheduled-appointments/`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'user-agent': userAgent,
    },
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to fetch scheduled appointments: ${response.status}${responseText ? `: ${responseText}` : ''}`,
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const result = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
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
