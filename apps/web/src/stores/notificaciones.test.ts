import { describe, expect, it } from 'vitest';
import { getActiveNotificationChannels } from './notificaciones';

describe('notification channel validation', () => {
  it('only enables WhatsApp and SMS when the phone number is verified', () => {
    expect(getActiveNotificationChannels(false)).toEqual(['PORTAL']);
    expect(getActiveNotificationChannels(true)).toEqual(['PORTAL', 'SMS', 'WHATSAPP']);
  });
});
