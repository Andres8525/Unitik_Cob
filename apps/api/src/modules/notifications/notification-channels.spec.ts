import { NotificationChannel } from '@prisma/client';
import { clientChannels, normalizeColombianMobile } from './notification-channels';

describe('notification channels (HU-08)', () => {
  it('normalises Colombian mobiles written in different ways', () => {
    expect(normalizeColombianMobile('3136543433')).toBe('3136543433');
    expect(normalizeColombianMobile('+57 313 654 3433')).toBe('3136543433');
    expect(normalizeColombianMobile('(313) 654-3433')).toBe('3136543433');
  });

  it('rejects landlines, short numbers and empty values', () => {
    expect(normalizeColombianMobile('6027201234')).toBeNull();
    expect(normalizeColombianMobile('31365')).toBeNull();
    expect(normalizeColombianMobile('')).toBeNull();
    expect(normalizeColombianMobile(null)).toBeNull();
  });

  it('only adds WhatsApp when the phone is a valid mobile', () => {
    expect(clientChannels({ phone: '3136543433', email: 'c@x.co' })).toEqual([
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      NotificationChannel.WHATSAPP,
    ]);
    expect(clientChannels({ phone: '000', email: 'c@x.co' })).toEqual([
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
    ]);
    expect(clientChannels({})).toEqual([NotificationChannel.IN_APP]);
  });
});
