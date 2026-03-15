import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractInterpolations(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(2, -2));
}

export function highlightInterpolations(text: string): string {
  return text.replace(
    /\{\{([^}]+)\}\}/g,
    '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{{$1}}</span>'
  );
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export function getKeySection(key: string): string {
  return key.split('.')[0];
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
