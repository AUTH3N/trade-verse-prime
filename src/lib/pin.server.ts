// Server-only PIN hashing helpers. Uses scrypt from node:crypto (Worker-compat).
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const KEY_LEN = 32;
const SALT_LEN = 16;

export function hashPin(pin: string): string {
  const salt = randomBytes(SALT_LEN);
  const derived = scryptSync(pin, salt, KEY_LEN);
  return `s1$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPinHash(pin: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "s1") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const derived = scryptSync(pin, salt, expected.length);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
