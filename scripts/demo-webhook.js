require('dotenv/config');

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const appUrl = process.env.APP_URL || 'http://127.0.0.1:3000';
const webhookUrl = `${appUrl}/cm-webhook`;
const mode = process.argv[2] || 'success';
const pollIntervalMs = Number(process.env.DEMO_POLL_INTERVAL_MS || 1000);
const timeoutMs = Number(
  process.env.DEMO_TIMEOUT_MS || (mode === 'fail' ? 70000 : 30000),
);
const failingTargetUrl =
  process.env.DEMO_FAIL_TARGET_URL || 'http://127.0.0.1:65535/unreachable';

async function main() {
  const payload = buildPayload(mode);
  const targetUrlOverride = mode === 'fail' ? failingTargetUrl : null;

  console.log(`Sending demo webhook to ${webhookUrl}`);
  console.log(`Mode: ${mode}`);
  console.log(`Payload: ${JSON.stringify(payload)}`);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(targetUrlOverride ? { 'x-webhook-target-url': targetUrlOverride } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Webhook endpoint returned ${response.status}${responseText ? `: ${responseText}` : ''}`,
    );
  }

  if (targetUrlOverride) {
    console.log(`Per-event target URL override: ${targetUrlOverride}`);
  }

  const latestEvent = await waitForEventByPayload(payload);
  console.log(`Stored event id: ${latestEvent.id}`);

  await watchEventLifecycle(latestEvent.id);
}

function buildPayload(mode) {
  const timestamp = new Date().toISOString();
  const appointmentId = `demo-${mode}-${Date.now()}`;

  return {
    event: 'appointment.updated',
    appointmentId,
    source: 'demo-script',
    mode,
    createdAt: timestamp,
    note:
      mode === 'fail'
        ? 'Manual end-to-end trigger for retry and failure observation'
        : 'Manual end-to-end trigger for webhook delivery',
  };
}

async function waitForEventByPayload(payload) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const event = await prisma.webhookEvent.findFirst({
      where: {
        appointmentId: payload.appointmentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (event) {
      return event;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error('Timed out waiting for the webhook event to be stored in MySQL');
}

async function watchEventLifecycle(eventId) {
  const startedAt = Date.now();
  let previousSnapshot = '';

  while (Date.now() - startedAt < timeoutMs) {
    const event = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error(`Webhook event ${eventId} disappeared while polling`);
    }

    const snapshot = JSON.stringify({
      status: event.status,
      retries: event.retries,
      nextRetryAt: event.nextRetryAt ? event.nextRetryAt.toISOString() : null,
      lastError: event.lastError,
      targetUrl: event.targetUrl,
    });

    if (snapshot !== previousSnapshot) {
      previousSnapshot = snapshot;
      console.log(
        `[${new Date().toISOString()}] status=${event.status} retries=${event.retries} nextRetryAt=${event.nextRetryAt ? event.nextRetryAt.toISOString() : 'null'} lastError=${event.lastError ?? 'null'} targetUrl=${event.targetUrl ?? 'default'}`,
      );
    }

    if (event.status === 'success') {
      console.log('Webhook delivery completed successfully.');
      return;
    }

    if (event.status === 'failed' && event.nextRetryAt === null) {
      console.log('Webhook delivery exhausted all retries and is now permanently failed.');
      return;
    }

    await sleep(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for webhook event ${eventId} to reach a terminal state`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
