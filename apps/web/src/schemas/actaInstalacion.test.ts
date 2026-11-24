import { describe, expect, it } from 'vitest';
import { actaInstalacionSchema } from './actaInstalacion';

const validActa = {
  clientId: '4c4a5d87-f829-4de5-b3ed-a79c4add268b',
  deviceId: 'ebdbac10-9680-48c7-897c-18480399df51',
  macAddress: 'aa:bb:cc:dd:ee:ff',
  equipmentSerial: 'hg8145v5-0001',
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
  it('upper-cases the serial and accepts MACs written with dashes', () => {
    const parsed = actaInstalacionSchema.parse({ ...validActa, macAddress: 'aa-bb-cc-dd-ee-ff' });
    expect(parsed.macAddress).toBe('AA:BB:CC:DD:EE:FF');
    expect(parsed.equipmentSerial).toBe('HG8145V5-0001');
  });

  it.each(['', 'ab', 'SERIAL CON ESPACIOS', 'x'.repeat(61)])(
    'rejects invalid serial "%s"',
    (equipmentSerial) => {
      expect(actaInstalacionSchema.safeParse({ ...validActa, equipmentSerial }).success).toBe(
        false,
      );
    },
  );

  it('requires choosing an available IP', () => {
    const result = actaInstalacionSchema.safeParse({ ...validActa, ipAddress: '' });
    expect(result.success).toBe(false);
  });
});
