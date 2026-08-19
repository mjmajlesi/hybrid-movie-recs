import { useEffect, useState } from 'react';

/**
 * Hook that delays updating the debounced value until `delay` milliseconds
 * have passed without the source value changing. Returns the debounced value.
 *
 * @param value The value to debounce
 * @param delay The delay in milliseconds (default: 300ms)
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}