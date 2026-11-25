import { NotificationChannel } from '@prisma/client';

/**
 * Normalises a Colombian mobile number to its 10 digits (3XXXXXXXXX), or null
 * when it isn't a valid mobile. Accepts +57, spaces, dashes and parentheses.
 */
export function normalizeColombianMobile(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[\s()+-]/g, '');
  if (/^57\d{10}$/.test(digits)) digits = digits.slice(2);
  return /^3\d{9}$/.test(digits) ? digits : null;
}

/**
 * HU-08 business rule: WhatsApp and SMS depend on a valid phone number in
 * the system. The in-app inbox always receives the message; e-mail is added
 * when the client has an address (every account has one today).
 */
export function clientChannels(contact: {
  phone?: string | null;
  email?: string | null;
}): NotificationChannel[] {
  const channels: NotificationChannel[] = [NotificationChannel.IN_APP];
  if (contact.email) channels.push(NotificationChannel.EMAIL);
  if (normalizeColombianMobile(contact.phone)) channels.push(NotificationChannel.WHATSAPP);
  return channels;
}
