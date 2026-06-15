import * as Sentry from '@sentry/react';
import { describe, it, expect, beforeAll } from 'vitest';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

beforeAll(() => {
  Sentry.init({
    dsn: DSN,
    enabled: !!DSN,
    environment: 'test',
    integrations: [],
    tracesSampleRate: 0,
  });
});

describe('Sentry — inicialización y captura', () => {
  // Sentry v10+ always creates a client after init(), even without a DSN.
  // These tests are only meaningful when a real DSN is configured.
  it.skipIf(!DSN)('cliente está definido cuando hay DSN', () => {
    expect(Sentry.getClient()).toBeDefined();
  });

  it.skipIf(!DSN)('captureException retorna un event ID válido', () => {
    const eventId = Sentry.captureException(
      new Error('Test automático Vitest — puedes ignorar este evento en Sentry'),
      { tags: { source: 'vitest' } },
    );
    // Un event ID de Sentry es un UUID de 32 chars hex sin guiones
    expect(eventId).toMatch(/^[0-9a-f]{32}$/i);
  });

  it('captureMessage no lanza excepciones', () => {
    expect(() =>
      Sentry.captureMessage('Test de mensaje desde Vitest', 'info'),
    ).not.toThrow();
  });
});
