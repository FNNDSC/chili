/**
 * @file Generic sorting utilities for list operations.
 *
 * Provides type-safe sorting functionality that can be applied to any
 * array of objects, supporting multiple sort fields and reverse ordering.
 *
 * @module
 */

/**
 * Sorts an array of objects by a specified field.
 *
 * @template T - The type of objects in the array.
 * @param items - Array of objects to sort.
 * @param sortBy - Field name to sort by.
 * @param reverse - Whether to reverse the sort order (default: false).
 * @returns A new sorted array (non-destructive).
 */
export function items_sort<T extends Record<string, any>>(
  items: T[],
  sortBy?: string,
  reverse: boolean = false
): T[] {
  if (!sortBy || items.length === 0) {
    return items;
  }

  const sorted = [...items].sort((a: T, b: T) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    // Handle undefined/null values
    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    let comparison: number = 0;

    // Determine comparison based on type
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime();
    } else {
      // Fallback: convert to string and compare
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return reverse ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Applies sorting to a list result based on CLI options.
 *
 * @template T - The type of objects in the list.
 * @param items - Array of items to potentially sort.
 * @param sortField - Optional field name to sort by.
 * @param reverse - Whether to reverse the sort order.
 * @returns Sorted or original array.
 */
export function list_applySort<T extends Record<string, any>>(
  items: T[],
  sortField?: string,
  reverse?: boolean
): T[] {
  if (!sortField) {
    return items;
  }
  return items_sort(items, sortField, reverse || false);
}
