import { useState, useCallback } from 'react';

type UseKeypadReturn = {
  value: string;
  append: (char: string) => void;
  backspace: () => void;
  clear: () => void;
};

export function useKeypad(maxLength: number = 8): UseKeypadReturn {
  const [value, setValue] = useState<string>('0');

  const append = useCallback(
    (char: string) => {
      // Prevent non-numeric inputs
      if (!/^\d$/.test(char)) {
        return;
      }

      setValue((prev) => {
        // If value is "0", replace it
        if (prev === '0') {
          return char;
        }

        // Ignore if length >= maxLength
        if (prev.length >= maxLength) {
          return prev;
        }

        return prev + char;
      });
    },
    [maxLength],
  );

  const backspace = useCallback(() => {
    setValue((prev) => {
      if (prev.length <= 1) {
        return '0';
      }
      return prev.slice(0, -1);
    });
  }, []);

  const clear = useCallback(() => {
    setValue('0');
  }, []);

  return {
    value,
    append,
    backspace,
    clear,
  };
}
