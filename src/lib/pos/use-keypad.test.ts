import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeypad } from './use-keypad';

describe('useKeypad', () => {
  it('appends numbers correctly ("0" -> "5" -> "50")', () => {
    const { result } = renderHook(() => useKeypad());

    expect(result.current.value).toBe('0');

    act(() => {
      result.current.append('5');
    });
    expect(result.current.value).toBe('5');

    act(() => {
      result.current.append('0');
    });
    expect(result.current.value).toBe('50');
  });

  it('handles backspace ("50" -> "5" -> "0")', () => {
    const { result } = renderHook(() => useKeypad());

    act(() => {
      result.current.append('5');
      result.current.append('0');
    });
    expect(result.current.value).toBe('50');

    act(() => {
      result.current.backspace();
    });
    expect(result.current.value).toBe('5');

    act(() => {
      result.current.backspace();
    });
    expect(result.current.value).toBe('0');
  });

  it('respects maxLength', () => {
    const { result } = renderHook(() => useKeypad(3));

    act(() => {
      result.current.append('1');
      result.current.append('2');
      result.current.append('3');
      result.current.append('4'); // Should be ignored
    });

    expect(result.current.value).toBe('123');
  });

  it('replaces "0" when appending first digit', () => {
    const { result } = renderHook(() => useKeypad());

    expect(result.current.value).toBe('0');

    act(() => {
      result.current.append('7');
    });

    expect(result.current.value).toBe('7');
    expect(result.current.value).not.toBe('07');
  });

  it('prevents non-numeric inputs', () => {
    const { result } = renderHook(() => useKeypad());

    act(() => {
      result.current.append('a');
      result.current.append('!');
      result.current.append('5');
    });

    expect(result.current.value).toBe('5');
  });

  it('clear resets to "0"', () => {
    const { result } = renderHook(() => useKeypad());

    act(() => {
      result.current.append('1');
      result.current.append('2');
      result.current.append('3');
    });

    expect(result.current.value).toBe('123');

    act(() => {
      result.current.clear();
    });

    expect(result.current.value).toBe('0');
  });
});
