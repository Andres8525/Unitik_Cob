import { describe, expect, it } from 'vitest';
import { actaInstalacionSchema } from './actaInstalacion';

const validActa = {
  clientId: '4c4a5d87-f829-4de5-b3ed-a79c4add268b',
  deviceId: 'ebdbac10-9680-48c7-897c-18480399df51',
  macAddress: 'aa:bb:cc:dd:ee:ff',
  ipAddress: '192.168.10.25',
  aplicarCostosExtra: false,
  observaciones: '',
};

describe('actaInstalacionSchema', () => {
  it('accepts a valid acta and normalizes the MAC address', () => {
    expect(actaInstalacionSchema.parse(validActa).macAddress).toBe('AA:BB:CC:DD:EE:FF');
  });

  it.each(['AABBCCDDEEFF', 'AA:BB:CC:DD:EE', 'GG:BB:CC:DD:EE:FF'])(
    'rejects malformed MAC address %s',
    (macAddress) => {
      expect(actaInstalacionSchema.safeParse({ ...validActa, macAddress }).success).toBe(false);
    },
  );

  it.each(['192.168.1', '999.168.1.1', '2001:db8::1'])(
    'rejects non-IPv4 address %s',
    (ipAddress) => {
      expect(actaInstalacionSchema.safeParse({ ...validActa, ipAddress }).success).toBe(false);
    },
  );
});
