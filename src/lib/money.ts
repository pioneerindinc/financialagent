import { assert } from "./errors";
export function cents(value: number): number {
  assert(Number.isSafeInteger(value), "Money must be safe integer cents");
  return value;
}
export const add = (a: number, b: number) => cents(cents(a) + cents(b));
export const subtract = (a: number, b: number) => cents(cents(a) - cents(b));
export function formatMoney(value: number) {
  cents(value);
  const n = BigInt(value);
  const absolute = n < BigInt(0) ? -n : n;
  return `${n < BigInt(0) ? "-" : ""}$${(absolute / BigInt(100)).toLocaleString("en-US")}.${String(absolute % BigInt(100)).padStart(2, "0")}`;
}
