'use client';

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';

/**
 * Formats a numeric value into a Guaraníes string with dot thousand separators (0 decimals).
 * Example: 1500000 -> "1.500.000"
 */
export function formatGuarani(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const num =
    typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : Math.round(value);
  if (isNaN(num)) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parses a formatted Guaraníes string into a pure integer number.
 * Example: "1.500.000" -> 1500000
 */
export function parseGuarani(str: string | null | undefined): number {
  if (!str) return 0;
  const digitsOnly = str.replace(/\D/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

export interface UseCurrencyInputOptions {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  allowEmpty?: boolean;
}

export interface UseCurrencyInputResult {
  numericValue: number;
  displayValue: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleBlur: () => void;
  setValue: (value: number) => void;
  inputProps: {
    ref: React.RefObject<HTMLInputElement | null>;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    inputMode: 'numeric';
    type: 'text';
  };
}

/**
 * Hook for smooth numeric currency input mask for Guaraníes (₲).
 * Features:
 * - 0 decimal places, dot (.) thousands separator.
 * - Smooth typing experience with cursor position preservation (no jumping/leaping).
 * - Works in controlled and uncontrolled modes.
 * - Native numeric keypad support (`inputMode="numeric"`).
 */
export function useCurrencyInput(options: UseCurrencyInputOptions = {}): UseCurrencyInputResult {
  const {
    value: controlledValue,
    defaultValue = 0,
    onChange: externalOnChange,
    min,
    max,
    allowEmpty = false,
  } = options;

  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<number>(
    isControlled ? (controlledValue ?? 0) : defaultValue,
  );
  const [isEditingEmpty, setIsEditingEmpty] = useState<boolean>(
    allowEmpty && (isControlled ? controlledValue === 0 : defaultValue === 0),
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<number | null>(null);

  const currentNumeric = isControlled ? (controlledValue ?? 0) : internalValue;

  // Restore cursor position after DOM update to prevent cursor leaping
  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    if (cursorPositionRef.current !== null && inputRef.current) {
      const pos = cursorPositionRef.current;
      inputRef.current.setSelectionRange(pos, pos);
      cursorPositionRef.current = null;
    }
  });

  const updateValue = useCallback(
    (nextNumeric: number, newCursorPos: number | null, isEmptyInput = false) => {
      let constrained = nextNumeric;
      if (min !== undefined && constrained < min) constrained = min;
      if (max !== undefined && constrained > max) constrained = max;

      cursorPositionRef.current = newCursorPos;
      setIsEditingEmpty(isEmptyInput);

      if (!isControlled) {
        setInternalValue(constrained);
      }
      if (externalOnChange) {
        externalOnChange(constrained);
      }
    },
    [isControlled, externalOnChange, min, max],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      const raw = input.value;
      const rawCursor = input.selectionStart ?? raw.length;

      // Count digits before cursor in raw input
      const digitsBeforeCursor = raw.slice(0, rawCursor).replace(/\D/g, '').length;

      // Digits only
      const digits = raw.replace(/\D/g, '');

      if (!digits || digits.length === 0) {
        updateValue(0, 0, true);
        return;
      }

      const numeric = parseInt(digits, 10);
      const formatted = formatGuarani(numeric);

      // Compute new cursor position matching the digit count
      let newCursorPos = formatted.length;
      if (digitsBeforeCursor === 0) {
        newCursorPos = 0;
      } else {
        let count = 0;
        for (let i = 0; i < formatted.length; i++) {
          if (/\d/.test(formatted[i])) {
            count++;
          }
          if (count >= digitsBeforeCursor) {
            newCursorPos = i + 1;
            break;
          }
        }
      }

      updateValue(numeric, newCursorPos, false);
    },
    [updateValue],
  );

  const handleBlur = useCallback(() => {
    setIsEditingEmpty(false);
  }, []);

  const setValueDirectly = useCallback(
    (val: number) => {
      updateValue(val, null, false);
    },
    [updateValue],
  );

  const displayValue =
    isEditingEmpty && allowEmpty && currentNumeric === 0 ? '' : formatGuarani(currentNumeric);

  return {
    numericValue: currentNumeric,
    displayValue,
    inputRef,
    handleChange,
    handleBlur,
    setValue: setValueDirectly,
    inputProps: {
      ref: inputRef,
      value: displayValue,
      onChange: handleChange,
      onBlur: handleBlur,
      inputMode: 'numeric',
      type: 'text',
    },
  };
}

export default useCurrencyInput;
