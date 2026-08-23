import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard utility for merging Tailwind classes.
 * Combines clsx for conditional classes and tailwind-merge for conflict resolution.
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
