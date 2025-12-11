/**
 * OpenContext - Utility functions
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize URL by adding https:// if protocol is missing
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`
}

/**
 * Validate if a URL has a valid format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(normalizeUrl(url))
    return true
  } catch {
    return false
  }
}

/**
 * Generate a unique ID for company profiles
 */
export function generateCompanyId(): string {
  return `company-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Finalizing...'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `~${minutes}m ${remainingSeconds}s remaining`
  }
  
  return `~${remainingSeconds}s remaining`
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}