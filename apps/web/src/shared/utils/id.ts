/**
 * Pure FP utility to generate secure unique identifiers.
 * Wraps crypto.randomUUID() to provide a consistent interface.
 */
export const generateId = <T extends string>(): T => {
	return crypto.randomUUID() as T;
};
