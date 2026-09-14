import { assert } from "./errors";
export function cents(value: number): number {
  assert(Number.isSafeInteger(value), "Money must be safe integer cents");
  return value;
}
export const add = (a: number, b: number) => cents(cents(a) + cents(b));
export const subtract = (a: number, b: number) => cents(cents(a) - cents(b));
export function dollarsToCents(input: string): number {
  const value = input.trim();
  if (!value) return 0;
  assert(
    value.length <= 32 && /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(value),
    "Enter a nonnegative dollar amount with at most two decimal places (for example, 125.50)",
  );
  const [whole, fraction = ""] = value.split(".");
  const amount =
    BigInt(whole || "0") * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  assert(
    amount <= BigInt(Number.MAX_SAFE_INTEGER),
    "Dollar amount is too large",
  );
  return Number(amount);
}
export function centsToDollarInput(value: number): string {
  cents(value);
  assert(value >= 0, "Journal amounts must be nonnegative");
  const amount = BigInt(value);
  return `${amount / BigInt(100)}.${String(amount % BigInt(100)).padStart(2, "0")}`;
}
export function formatMoney(value: number) {
  cents(value);
  const n = BigInt(value);
  const absolute = n < BigInt(0) ? -n : n;
  return `${n < BigInt(0) ? "-" : ""}$${(absolute / BigInt(100)).toLocaleString("en-US")}.${String(absolute % BigInt(100)).padStart(2, "0")}`;
}
