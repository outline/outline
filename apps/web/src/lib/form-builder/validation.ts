/**
 * Form Builder Validation Engine - Zod-based
 * Validates form data against DocType schema using Zod
 */

import { z } from "zod";
import type { TDocType, TFieldSchema, TFormFieldErrors } from "./types";

// ============================================================================
// Zod Schema Builder
// ============================================================================

/**
 * Build a Zod schema from a single field definition
 */
const buildFieldSchema = (field: TFieldSchema): z.ZodTypeAny => {
	let schema: z.ZodTypeAny;

	switch (field.fieldtype) {
		case "text":
		case "long_text":
		case "code":
		case "markdown":
		case "password":
		case "color":
		case "signature":
		case "geolocation":
		case "dynamic_link": {
			let stringSchema = z.string();
			if (field.min_length !== undefined) {
				stringSchema = stringSchema.min(field.min_length, {
					message: `${field.label} minimal ${field.min_length} karakter`,
				});
			}
			if (field.max_length !== undefined) {
				stringSchema = stringSchema.max(field.max_length, {
					message: `${field.label} maksimal ${field.max_length} karakter`,
				});
			}
			schema = stringSchema;
			break;
		}

		case "number":
		case "currency":
		case "percent":
		case "rating": {
			let numberSchema = z.coerce.number({
				message: `${field.label} harus berupa angka`,
			});
			if (field.min_value !== undefined) {
				numberSchema = numberSchema.min(field.min_value, {
					message: `${field.label} minimal ${field.min_value}`,
				});
			}
			if (field.max_value !== undefined) {
				numberSchema = numberSchema.max(field.max_value, {
					message: `${field.label} maksimal ${field.max_value}`,
				});
			}
			schema = numberSchema;
			break;
		}

		case "date":
		case "datetime":
		case "time": {
			schema = z.string().min(1, {
				message: `${field.label} wajib diisi`,
			});
			break;
		}

		case "select": {
			let selectSchema: z.ZodTypeAny = z.string();
			if (field.options && field.options.length > 0) {
				const validValues = field.options.map((opt) => opt.value);
				selectSchema = selectSchema.refine(
					(val) => val === "" || validValues.includes(val),
					{ message: `${field.label} memiliki nilai tidak valid` },
				);
			}
			schema = selectSchema;
			break;
		}

		case "radio": {
			let radioSchema: z.ZodTypeAny = z.string();
			if (field.options && field.options.length > 0) {
				const validValues = field.options.map((opt) => opt.value);
				radioSchema = radioSchema.refine(
					(val) => val === "" || validValues.includes(val),
					{ message: `${field.label} memiliki nilai tidak valid` },
				);
			}
			schema = radioSchema;
			break;
		}

		case "check": {
			schema = z.boolean();
			break;
		}

		case "multiselect": {
			schema = z.array(z.string());
			break;
		}

		case "link": {
			schema = z.string();
			break;
		}

		case "table": {
			schema = z.array(z.record(z.unknown()));
			break;
		}

		default: {
			schema = z.unknown();
			break;
		}
	}

	// Handle required vs optional
	if (!field.required) {
		// Allow empty string, null, undefined for non-required fields
		if (
			field.fieldtype === "text" ||
			field.fieldtype === "long_text" ||
			field.fieldtype === "code" ||
			field.fieldtype === "markdown" ||
			field.fieldtype === "password" ||
			field.fieldtype === "select" ||
			field.fieldtype === "radio" ||
			field.fieldtype === "link" ||
			field.fieldtype === "color"
		) {
			schema = schema.or(z.literal("")).or(z.null()).or(z.undefined());
		}
	} else {
		// For required fields, add a refinement for empty values
		if (
			field.fieldtype === "text" ||
			field.fieldtype === "long_text" ||
			field.fieldtype === "code" ||
			field.fieldtype === "markdown" ||
			field.fieldtype === "password" ||
			field.fieldtype === "select" ||
			field.fieldtype === "radio" ||
			field.fieldtype === "link"
		) {
			schema = schema.refine(
				(val) => val !== "" && val !== null && val !== undefined,
				{
					message: `${field.label} wajib diisi`,
				},
			);
		}
	}

	return schema;
};

/**
 * Build a complete Zod schema from a DocType
 */
export const buildZodSchema = (
	doctype: TDocType,
	values?: Record<string, unknown>,
): z.ZodObject<Record<string, z.ZodTypeAny>> => {
	const shape: Record<string, z.ZodTypeAny> = {};

	for (const field of doctype.fields) {
		// Skip layout fields
		if (
			field.fieldtype === "step_break" ||
			field.fieldtype === "section_break" ||
			field.fieldtype === "column_break" ||
			field.fieldtype === "tab_break"
		) {
			continue;
		}

		// Check visibility if values provided
		if (values) {
			const isVisible = evaluateDependsOn(field.depends_on, values);
			if (!isVisible) continue;
		}

		// Check if field is dynamically required
		const isDynamicallyRequired = values
			? evaluateDependsOn(field.mandatory_depends_on, values)
			: false;

		const fieldWithDynamicRequired = isDynamicallyRequired
			? { ...field, required: true }
			: field;

		shape[field.fieldname] = buildFieldSchema(fieldWithDynamicRequired);
	}

	return z.object(shape);
};

// ============================================================================
// Validation Result
// ============================================================================

export type TValidationResult = {
	readonly valid: boolean;
	readonly errors: TFormFieldErrors;
};

// ============================================================================
// Dynamic Expressions
// ============================================================================

/**
 * Evaluate dependency expressions.
 * For depends_on: return true (visible) if undefined.
 * For read_only_depends_on: return false (not read-only) if undefined.
 */
export const evaluateDependsOn = (
	expression: string | undefined,
	values: Record<string, unknown>,
	isReadOnlyCheck: boolean = false,
): boolean => {
	if (!expression) return !isReadOnlyCheck;

	// Simple field name check (truthiness)
	if (!expression.startsWith("eval:")) {
		const fieldValue = values[expression];
		return Boolean(fieldValue);
	}

	// JavaScript expression evaluation
	const jsExpression = expression.slice(5); // Remove "eval:" prefix
	try {
		const doc = { ...values };
		const keys = Object.keys(values);
		const valuesArray = keys.map((k) => values[k]);
		const fn = new Function("doc", ...keys, `return ${jsExpression}`);
		return Boolean(fn(doc, ...valuesArray));
	} catch {
		return !isReadOnlyCheck;
	}
};

/**
 * Evaluate mathematical or string formulas.
 * Example: "doc.qty * doc.price"
 */
export const evaluateFormula = (
	formula: string | undefined,
	values: Record<string, unknown>,
): unknown => {
	if (!formula) return undefined;

	try {
		const doc = { ...values };
		const keys = Object.keys(values);
		const valuesArray = keys.map((k) => values[k]);

		const fn = new Function("doc", ...keys, `return ${formula}`);
		return fn(doc, ...valuesArray);
	} catch (error) {
		console.warn(`[FormBuilder] Failed to evaluate formula: ${formula}`, error);
		return undefined;
	}
};

// ============================================================================
// Main Validation Function
// ============================================================================

export const validateForm = (
	doctype: TDocType,
	values: Record<string, unknown>,
	fieldsToValidate?: string[],
): TValidationResult => {
	const schema = buildZodSchema(doctype, values);
	const result = schema.safeParse(values);

	if (result.success) {
		return { valid: true, errors: {} };
	}

	const errors: TFormFieldErrors = {};
	let valid = true;
	for (const issue of result.error.issues) {
		const fieldname = String(issue.path[0]);
		if (!errors[fieldname]) {
			if (!fieldsToValidate || fieldsToValidate.includes(fieldname)) {
				errors[fieldname] = issue.message;
				valid = false;
			}
		}
	}

	return { valid, errors };
};

// ============================================================================
// Single Field Validation
// ============================================================================

export const validateField = (
	field: TFieldSchema,
	value: unknown,
	values: Record<string, unknown>,
): string | null => {
	const isDynamicallyRequired = evaluateDependsOn(
		field.mandatory_depends_on,
		values,
	);
	const fieldWithDynamicRequired = isDynamicallyRequired
		? { ...field, required: true }
		: field;

	const schema = buildFieldSchema(fieldWithDynamicRequired);
	const result = schema.safeParse(value);

	if (result.success) return null;

	return result.error.issues[0]?.message ?? null;
};
