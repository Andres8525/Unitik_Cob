/**
 * IPv4 pool helpers used to list the free client addresses of a router.
 * Pure functions (no I/O) so they are cheap to unit test.
 */

/** Largest pool we enumerate: a /20 (4094 hosts) covers any rural ISP segment. */
export const MIN_PREFIX = 20;

export interface ParsedCidr {
  network: number;
  prefix: number;
  /** First usable host (network + 1). */
  firstHost: number;
  /** Last usable host (broadcast - 1). */
  lastHost: number;
}

export function ipToInt(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

export function intToIp(value: number): string {
  return [24, 16, 8, 0].map((shift) => Math.floor(value / 2 ** shift) % 256).join('.');
}

export function parseCidr(cidr: string): ParsedCidr | null {
  const [ip, prefixText] = cidr.trim().split('/');
  const base = ipToInt(ip ?? '');
  const prefix = Number(prefixText);
  if (base === null || !Number.isInteger(prefix) || prefix < MIN_PREFIX || prefix > 30) return null;
  const size = 2 ** (32 - prefix);
  const network = base - (base % size);
  return { network, prefix, firstHost: network + 1, lastHost: network + size - 2 };
}

/** When a router has no pool configured, assume the /24 it lives in. */
export function defaultPoolFor(deviceIp: string): string | null {
  const value = ipToInt(deviceIp);
  if (value === null) return null;
  return `${intToIp(value - (value % 256))}/24`;
}

export interface AvailableIpsResult {
  pool: string;
  total: number;
  used: number;
  available: string[];
}

/**
 * Lists the free hosts of `pool`, skipping the gateway (first host), the
 * router's own address and every address already assigned to a client.
 */
export function availableIps(
  pool: string,
  assigned: Iterable<string>,
  reserved: Iterable<string> = [],
  limit = 256,
): AvailableIpsResult | null {
  const parsed = parseCidr(pool);
  if (!parsed) return null;

  const taken = new Set<number>();
  for (const ip of [...assigned, ...reserved]) {
    const value = ipToInt(ip);
    if (value !== null && value >= parsed.firstHost && value <= parsed.lastHost) taken.add(value);
  }
  taken.add(parsed.firstHost); // gateway

  const total = parsed.lastHost - parsed.firstHost + 1;
  const available: string[] = [];
  for (
    let host = parsed.firstHost;
    host <= parsed.lastHost && available.length < limit;
    host += 1
  ) {
    if (!taken.has(host)) available.push(intToIp(host));
  }

  return {
    pool: `${intToIp(parsed.network)}/${parsed.prefix}`,
    total,
    used: taken.size,
    available,
  };
}
