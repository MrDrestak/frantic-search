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
  it('cliente está definido cuando hay DSN', () => {
    if (!DSN) {
      expect(Sentry.getClient()).toBeUndefined();
      return;
    }
    expect(Sentry.getClient()).toBeDefined();
  });

  it('captureException retorna un event ID válido', () => {
    const eventId = Sentry.captureException(
      new Error('Test automático Vitest — puedes ignorar este evento en Sentry'),
      { tags: { source: 'vitest' } },
    );

    if (!DSN) {
      // Sin DSN el SDK devuelve string vacío o undefined
      expect(eventId == null || eventId === '').toBe(true);
      return;
    }

    // Un event ID de Sentry es un UUID de 32 chars hex sin guiones
    expect(eventId).toMatch(/^[0-9a-f]{32}$/i);
  });

  it('captureMessage no lanza excepciones', () => {
    expect(() =>
      Sentry.captureMessage('Test de mensaje desde Vitest', 'info'),
    ).not.toThrow();
  });
});
