/** The kinds of field a form can carry. */
export type FieldType =
  | "text"
  | "email"
  | "number"
  | "currency"
  | "select"
  | "textarea";
/** One field on a form, described rather than written out. */
export interface FieldSchema {
  fieldname: string;
  label: string;
  fieldtype: FieldType;
  required?: boolean;
  min?: number;
  max?: number;
  options?: {
    value: string;
    label: string;
  }[];
  defaultValue?: string;
  placeholder?: string;
  /** Only shown while this holds, e.g. `type == suite`. */
  dependsOn?: string;
  short?: boolean;
}
/** A whole form, described as data. */
export interface DocType {
  name: string;
  title: string;
  fields: FieldSchema[];
}
/** The values a form is holding, keyed by field name. */
export type FormValues = Record<string, string>;
/**
 * Whether a field's condition holds.
 *
 * @param expression the condition, or undefined for always.
 * @param values what the form currently holds.
 * @returns true when the field should be shown.
 */
export function evaluateDependsOn(
  expression: string | undefined,
  values: FormValues
): boolean {
  if (!expression) {
    return true;
  }
  const comparison = /^\s*(\w+)\s*(==|!=)\s*(.+?)\s*$/.exec(expression);
  if (comparison) {
    const [, field, operator, expected] = comparison;
    const actual = values[field] ?? "";
    return operator === "==" ? actual === expected : actual !== expected;
  }
  // A bare field name means "has a value".
  if (/^\s*\w+\s*$/.test(expression)) {
    return Boolean(values[expression.trim()]);
  }
  // Anything else cannot be judged, and a field nobody can explain is better
  // hidden than shown on a guess.
  return false;
}
/**
 * The fields that should be on screen for the values given.
 *
 * @param doctype the form description.
 * @param values what the form currently holds.
 * @returns the fields to show.
 */
export function visibleFields(
  doctype: DocType,
  values: FormValues
): FieldSchema[] {
  return doctype.fields.filter((field) =>
    evaluateDependsOn(field.dependsOn, values)
  );
}
/**
 * Checks a form against its description.
 *
 * @param doctype the form description.
 * @param values what the form holds.
 * @returns a message per field that is wrong; empty when it is all fine.
 */
export function validateForm(
  doctype: DocType,
  values: FormValues
): Record<string, string> {
  const errors: Record<string, string> = {};
  // Only what is on screen is checked: demanding a field nobody can see would
  // leave the form unsubmittable with nothing to fix.
  visibleFields(doctype, values).forEach((field) => {
    const raw = values[field.fieldname] ?? "";
    const value = raw.trim();
    if (field.required && !value) {
      errors[field.fieldname] = `${field.label} is required.`;
      return;
    }
    if (!value) {
      return;
    }
    if (field.fieldtype === "number" || field.fieldtype === "currency") {
      const asNumber = Number(value);
      if (!Number.isFinite(asNumber)) {
        errors[field.fieldname] = `${field.label} has to be a number.`;
        return;
      }
      if (field.min !== undefined && asNumber < field.min) {
        errors[field.fieldname] =
          `${field.label} cannot be below ${field.min}.`;
        return;
      }
      if (field.max !== undefined && asNumber > field.max) {
        errors[field.fieldname] =
          `${field.label} cannot be above ${field.max}.`;
        return;
      }
    }
    if (
      field.fieldtype === "email" &&
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
    ) {
      errors[field.fieldname] = `${field.label} has to be an email address.`;
      return;
    }
    if (
      field.fieldtype === "select" &&
      field.options &&
      !field.options.some((option) => option.value === value)
    ) {
      errors[field.fieldname] = `${field.label} is not one of the choices.`;
    }
  });
  return errors;
}
