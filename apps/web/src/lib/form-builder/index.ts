/**
 * Form Builder - Frappe-like JSON Schema UI System
 * Main entry point
 */

export { BranchDocType } from "./examples/branch.doctype";
export { BusinessSettingsDocType } from "./examples/business-settings.doctype";
export { ContactDocType } from "./examples/contact.doctype";
export { ForgotPasswordDocType } from "./examples/forgot-password.doctype";
export { InviteStaffDocType } from "./examples/invite-staff.doctype";
export { LoginDocType } from "./examples/login.doctype";
export { LoyaltyConfigDocType } from "./examples/loyalty-config.doctype";

// Example schemas
export { ProductDocType } from "./examples/product.doctype";
export { ProfileSettingsDocType } from "./examples/profile-settings.doctype";
export { ResetPasswordDocType } from "./examples/reset-password.doctype";
export { SignupDocType } from "./examples/signup.doctype";
export type { TFieldRendererProps } from "./field-renderer";
export { FieldRenderer } from "./field-renderer";
export type { TFormBuilderProps } from "./form-builder";
export { FormBuilder } from "./form-builder";
export type {
	TAction,
	TActionType,
	TDocType,
	TFieldOption,
	TFieldSchema,
	TFieldType,
	TFormBuilderConfig,
	TFormFieldErrors,
	TFormState,
	TLink,
	TLinkFilter,
	TPermission,
	TWorkflow,
	TWorkflowState,
	TWorkflowTransition,
} from "./types";
export type { TValidationResult } from "./validation";
export {
	buildZodSchema,
	evaluateDependsOn,
	validateField,
	validateForm,
} from "./validation";
