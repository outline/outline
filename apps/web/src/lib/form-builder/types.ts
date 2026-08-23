/**
 * Form Builder Types - Frappe-like JSON Schema UI System
 * Defines the complete type system for schema-driven form rendering
 */

// ============================================================================
// Field Types
// ============================================================================

export type TFieldType =
	// Layout
	| "step_break"
	| "section_break"
	| "column_break"
	| "tab_break"
	// Text & Number
	| "text"
	| "long_text"
	| "code"
	| "markdown"
	| "password"
	| "number"
	| "phone"
	| "currency"
	| "percent"
	| "rating"
	// Date & Time
	| "date"
	| "time"
	| "datetime"
	| "date_range"
	// Choice & Boolean
	| "select"
	| "radio"
	| "check"
	| "multiselect"
	// Relational
	| "link"
	| "dynamic_link"
	// Special
	| "color"
	| "signature"
	| "geolocation"
	| "image"
	| "attach"
	| "custom_component"
	// Table
	| "table";

// ============================================================================
// Field Option
// ============================================================================

export type TFieldOption = {
	readonly value: string;
	readonly label: string;
	readonly description?: string;
	readonly icon?: string;
};

// ============================================================================
// Link Filter
// ============================================================================

export type TLinkFilter = readonly [
	string, // DocType
	string, // fieldname
	string, // operator
	string, // value
];

// ============================================================================
// Field Schema
// ============================================================================

export type TFieldSchema = {
	readonly fieldname: string;
	readonly fieldtype: TFieldType;
	readonly label: string;

	// Display
	readonly placeholder?: string;
	readonly description?: string;
	readonly hidden?: boolean;
	readonly read_only?: boolean;
	readonly required?: boolean;

	// Layout
	readonly colspan?: number;
	readonly tab?: string;

	// Validation
	readonly min_length?: number;
	readonly max_length?: number;
	readonly min_value?: number;
	readonly max_value?: number;
	readonly precision?: number;
	readonly options?: readonly TFieldOption[];
	readonly default_value?: unknown;

	// Advanced / Computations
	readonly depends_on?: string; // Example: "eval:doc.status==='Active'"
	readonly mandatory_depends_on?: string;
	readonly formula?: string; // Example: "doc.qty * doc.price"
	readonly fetch_from?: string; // Example: "customer.phone_number"
	readonly read_only_depends_on?: string;

	// Relational
	readonly link_doctype?: string;
	readonly link_filters?: readonly TLinkFilter[];

	// Table
	readonly child_doctype?: string;
	readonly child_fields?: readonly TFieldSchema[];

	// Permissions
	readonly permlevel?: number;

	// Display options
	readonly in_list_view?: boolean;
	readonly in_filter?: boolean;
	readonly in_standard_filter?: boolean;
	readonly is_primary_field?: boolean;

	// Styling
	readonly css_class?: string;
	readonly width?: string;

	// Tooltip
	readonly tooltip?: string;
	readonly tooltip_icon?: string;
	readonly icon?: string;
};

// ============================================================================
// Permission
// ============================================================================

export type TPermission = {
	readonly role: string;
	readonly read?: boolean;
	readonly write?: boolean;
	readonly create?: boolean;
	readonly delete?: boolean;
	readonly submit?: boolean;
	readonly cancel?: boolean;
	readonly amend?: boolean;
	readonly if_owner?: boolean;
	readonly permlevel?: number;
	readonly match?: string;
};

// ============================================================================
// Action
// ============================================================================

export type TActionType = "server" | "client" | "link";

export type TAction = {
	readonly label: string;
	readonly action_type: TActionType;
	readonly method?: string;
	readonly handler?: string;
	readonly url?: string;
	readonly variant?: "default" | "destructive" | "outline" | "ghost";
	readonly icon?: string;
	readonly confirm?: boolean;
	readonly confirm_message?: string;
	readonly depends_on?: string;
	readonly group?: string;
};

// ============================================================================
// Workflow
// ============================================================================

export type TWorkflowTransition = {
	readonly from_state: string;
	readonly to_state: string;
	readonly action: string;
	readonly roles?: readonly string[];
	readonly condition?: string;
};

export type TWorkflowState = {
	readonly name: string;
	readonly style?: "primary" | "success" | "warning" | "danger" | "info";
	readonly is_active?: boolean;
};

export type TWorkflow = {
	readonly name: string;
	readonly states: readonly TWorkflowState[];
	readonly transitions: readonly TWorkflowTransition[];
};

// ============================================================================
// Link (Sidebar Connections)
// ============================================================================

export type TLink = {
	readonly link_doctype: string;
	readonly link_fieldname: string;
	readonly label?: string;
	readonly group?: string;
};

// ============================================================================
// DocType (Root Schema)
// ============================================================================

export type TDocType = {
	// Identity
	readonly name: string;
	readonly module?: string;
	readonly description?: string;

	// Fields
	readonly fields: readonly TFieldSchema[];

	// Permissions
	readonly permissions?: readonly TPermission[];

	// Actions
	readonly actions?: readonly TAction[];

	// Workflow
	readonly workflow?: TWorkflow;

	// Links
	readonly links?: readonly TLink[];

	// Behavior
	readonly is_submittable?: boolean;
	readonly is_child?: boolean;
	readonly track_changes?: boolean;
	readonly autoname?: string;
	readonly naming_rule?: string;

	// Display
	readonly icon?: string;
	readonly title_field?: string;
	readonly search_fields?: string;
	readonly sort_field?: string;
	readonly sort_order?: "ASC" | "DESC";

	// Hooks
	readonly before_save?: string;
	readonly after_save?: string;
	readonly validate?: string;
	readonly on_submit?: string;
	readonly on_cancel?: string;
};

// ============================================================================
// Form State
// ============================================================================

export type TFormFieldErrors = Record<string, string>;

export type TFormState = {
	readonly values: Record<string, unknown>;
	readonly errors: TFormFieldErrors;
	readonly touched: Record<string, boolean>;
	readonly isSubmitting: boolean;
	readonly isDirty: boolean;
	readonly docstatus: 0 | 1 | 2;
};

// ============================================================================
// Form Builder Config
// ============================================================================

export type TFormBuilderConfig = {
	readonly doctype: TDocType;
	readonly initialValues?: Record<string, unknown>;
	readonly mode?: "create" | "edit" | "view";
	readonly onSubmit?: (values: Record<string, unknown>) => Promise<void>;
	readonly onCancel?: () => void;
	readonly onChange?: (values: Record<string, unknown>) => void;
};
