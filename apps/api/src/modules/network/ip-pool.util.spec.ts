import { availableIps, defaultPoolFor, intToIp, ipToInt, parseCidr } from './ip-pool.util';

describe('ip-pool util', () => {
  it('converts between dotted IPv4 and integers', () => {
    expect(ipToInt('10.20.0.1')).toBe(169082881);
    expect(intToIp(169082881)).toBe('10.20.0.1');
    expect(ipToInt('300.1.1.1')).toBeNull();
    expect(ipToInt('10.20.0')).toBeNull();
  });

  it('parses CIDR blocks and rejects pools that are too large or malformed', () => {
    expect(parseCidr('192.168.10.77/24')).toMatchObject({
      prefix: 24,
      firstHost: ipToInt('192.168.10.1'),
      lastHost: ipToInt('192.168.10.254'),
    });
    expect(parseCidr('10.0.0.0/8')).toBeNull();
    expect(parseCidr('10.0.0.0')).toBeNull();
  });

  it('derives a /24 pool from the router address', () => {
    expect(defaultPoolFor('192.168.88.1')).toBe('192.168.88.0/24');
  });

  it('lists free hosts skipping gateway, router and assigned addresses', () => {
    const result = availableIps('192.168.10.0/29', ['192.168.10.3', '10.0.0.9'], ['192.168.10.2']);

    expect(result).toEqual({
      pool: '192.168.10.0/29',
      total: 6,
      used: 3,
      available: ['192.168.10.4', '192.168.10.5', '192.168.10.6'],
    });
  });

  it('honours the result limit', () => {
    expect(availableIps('10.20.0.0/24', [], [], 5)?.available).toEqual([
      '10.20.0.2',
      '10.20.0.3',
      '10.20.0.4',
      '10.20.0.5',
      '10.20.0.6',
    ]);
  });
});
