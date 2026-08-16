import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, useIsMobile } from '../hooks/useMediaQuery';
import { useCurrencyInput, formatGuarani, parseGuarani } from '../hooks/useCurrencyInput';

describe('useMediaQuery', () => {
  let matchMediaMock: jest.Mock;
  let listeners: ((event: MediaQueryListEvent) => void)[] = [];

  beforeEach(() => {
    listeners = [];
    matchMediaMock = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width: 767px'),
      media: query,
      onchange: null,
      addListener: jest.fn((cb) => listeners.push(cb)),
      removeListener: jest.fn(),
      addEventListener: jest.fn((_, cb) => listeners.push(cb)),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    window.matchMedia = matchMediaMock;
  });

  it('evaluates media query correctly on mount', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);
    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('useIsMobile evaluates 768px boundary by default', () => {
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('updates when media query change event fires', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 767px)'));
    expect(result.current).toBe(true);

    act(() => {
      listeners.forEach((listener) =>
        listener({ matches: false, media: '(max-width: 767px)' } as MediaQueryListEvent),
      );
    });

    expect(result.current).toBe(false);
  });
});

describe('useCurrencyInput & Guarani utils', () => {
  describe('formatGuarani and parseGuarani', () => {
    it('formats numbers with thousands dots and 0 decimals', () => {
      expect(formatGuarani(1500000)).toBe('1.500.000');
      expect(formatGuarani(0)).toBe('0');
      expect(formatGuarani(123456789)).toBe('123.456.789');
      expect(formatGuarani('')).toBe('');
      expect(formatGuarani(null)).toBe('');
    });

    it('parses formatted string back into number', () => {
      expect(parseGuarani('1.500.000')).toBe(1500000);
      expect(parseGuarani('123.456.789')).toBe(123456789);
      expect(parseGuarani('')).toBe(0);
      expect(parseGuarani(null)).toBe(0);
    });
  });

  describe('useCurrencyInput hook', () => {
    it('initializes with default value 0 or initial value', () => {
      const { result } = renderHook(() => useCurrencyInput({ defaultValue: 500000 }));
      expect(result.current.numericValue).toBe(500000);
      expect(result.current.displayValue).toBe('500.000');
      expect(result.current.inputProps.inputMode).toBe('numeric');
    });

    it('handles typing numbers and formats properly', () => {
      const onChangeMock = jest.fn();
      const { result } = renderHook(() =>
        useCurrencyInput({ defaultValue: 0, onChange: onChangeMock }),
      );

      const fakeInput = {
        value: '1500000',
        selectionStart: 7,
        setSelectionRange: jest.fn(),
      } as unknown as HTMLInputElement;

      act(() => {
        result.current.handleChange({
          currentTarget: fakeInput,
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.numericValue).toBe(1500000);
      expect(result.current.displayValue).toBe('1.500.000');
      expect(onChangeMock).toHaveBeenCalledWith(1500000);
    });

    it('respects min and max bounds', () => {
      const { result } = renderHook(() => useCurrencyInput({ defaultValue: 0, max: 100000 }));

      const fakeInput = {
        value: '500000',
        selectionStart: 6,
      } as unknown as HTMLInputElement;

      act(() => {
        result.current.handleChange({
          currentTarget: fakeInput,
        } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.numericValue).toBe(100000);
      expect(result.current.displayValue).toBe('100.000');
    });
  });
});
