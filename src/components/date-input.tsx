"use client";
import { useState } from "react";
import { formatDate, parseDisplayDate } from "../lib/dates";

export function DateInput({
  name,
  defaultValue = "",
  required = false,
  onDateChange,
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
  onDateChange?: (iso: string) => void;
}) {
  const [value, setValue] = useState(
    defaultValue ? formatDate(defaultValue) : "",
  );
  const [invalid, setInvalid] = useState(false);
  const iso = parseDisplayDate(value) || "";
  return (
    <>
      <input
        type="text"
        placeholder="MM-DD-YYYY"
        title="MM-DD-YYYY"
        maxLength={10}
        required={required}
        value={value}
        aria-invalid={invalid}
        onBlur={(event) => {
          event.currentTarget.reportValidity();
        }}
        onChange={(event) => {
          const text = event.target.value;
          const parsed = parseDisplayDate(text);
          const bad = !!text && !parsed;
          event.target.setCustomValidity(
            bad ? "Enter a valid date in MM-DD-YYYY format." : "",
          );
          setValue(text);
          setInvalid(bad);
          onDateChange?.(parsed || "");
        }}
      />
      {name && <input type="hidden" name={name} value={iso} />}
    </>
  );
}
