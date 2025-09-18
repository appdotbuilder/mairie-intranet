import { type ClassValue, clsx } from 'clsx';

// Simple class name utility for combining Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}