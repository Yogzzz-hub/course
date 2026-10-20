import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
export const token = () => randomBytes(32).toString('hex');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export function passwordHash(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;
}
export function verifyPassword(password: string, encoded: string) {
  try {
    const [salt, key] = encoded.split(':');
    if (!salt || !/^[a-f0-9]{32}$/.test(salt) || !key || !/^[a-f0-9]{128}$/.test(key)) return false;
    const computed = scryptSync(password, salt, 64);
    const expected = Buffer.from(key, 'hex');
    if (computed.length !== expected.length) return false;
    return timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}
export const permissions = {
  owner: ['metrics','questions','publish','leads'], administrator: ['metrics','questions','publish','leads'],
  instructor: ['metrics','questions'], counselor: ['leads'], analyst: ['metrics'],
};
export function permitted(role: string, permission: string) {
  return Object.hasOwn(permissions,role) && permissions[role as keyof typeof permissions].includes(permission);
}
