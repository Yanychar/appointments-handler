require('dotenv/config');

const apiBaseUrl =
  process.env.CLINICMINDS_API_BASE_URL ||
  'https://app.clinicminds.com/api/triggers-actions';

async function main() {
  const apiKey = requireEnv('CLINICMINDS_API_KEY');
  const userAgent = requireEnv('CLINICMINDS_USER_AGENT');
  const clientIdNumber = getClientIdNumber();
  const filter = getFilter();
  const searchParams = new URLSearchParams({
    client_id_number: clientIdNumber,
    filter,
  });

  console.log(
    `Searching Clinicminds appointments for client_id_number=${clientIdNumber} filter=${filter}`,
  );

  const response = await fetch(`${apiBaseUrl}/search-appointments/?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'user-agent': userAgent,
    },
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Failed to search appointments: ${response.status}${responseText ? `: ${responseText}` : ''}`,
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const result = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  console.log(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
}

function getClientIdNumber() {
  const cliValue = process.argv[2];

  if (cliValue && cliValue.trim().length > 0) {
    return cliValue.trim();
  }

  return "";
}

function getFilter() {
  const cliValue = process.argv[3];

  if (cliValue && cliValue.trim().length > 0) {
    return cliValue.trim();
  }

  const envValue = "future";

  if (envValue && envValue.trim().length > 0) {
    return envValue.trim();
  }

  return 'future';
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
