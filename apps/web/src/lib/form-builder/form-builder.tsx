/**
 * Form Builder - Main Form Renderer
 * Renders complete forms from DocType JSON schema
 */

"use client";

import { motion } from "motion/react";
import React, {
	useCallback,
	useEffect,
	useImperativeHandle,
	useMemo,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";
import { devLog } from "@/shared/utils/dev-logger";
import { extractErrorMessage } from "@/shared/utils/error";
import { FieldRenderer } from "./field-renderer";
import type { TDocType, TFieldSchema, TFormFieldErrors } from "./types";
import { evaluateDependsOn, evaluateFormula, validateForm } from "./validation";

// ============================================================================
// Helpers
// ============================================================================

const getDefaultValue = (field: TFieldSchema): unknown => {
	if (field.default_value !== undefined) return field.default_value;
	switch (field.fieldtype) {
		case "check":
			return false;
		case "currency":
			return 0;
		case "table":
			return [];
		default:
			return "";
	}
};

const getInitialValues = (
	doctype: TDocType,
	initialValues?: Record<string, unknown>,
): Record<string, unknown> => {
	const defaults: Record<string, unknown> = {};

	for (const field of doctype.fields) {
		if (
			field.fieldtype === "section_break" ||
			field.fieldtype === "column_break" ||
			field.fieldtype === "tab_break" ||
			field.fieldtype === "step_break"
		) {
			continue;
		}
		defaults[field.fieldname] = getDefaultValue(field);
	}

	return { ...defaults, ...initialValues };
};

// ============================================================================
// FormBuilder Props
// ============================================================================

export type TFormBuilderProps = {
	readonly doctype: TDocType;
	readonly initialValues?: Record<string, unknown>;
	readonly mode?: "create" | "edit" | "view";
	readonly onSubmit?: (values: Record<string, unknown>) => Promise<{
		message?: string;
		error?: boolean;
	}>;
	readonly onCancel?: () => void;
	readonly onChange?: (values: Record<string, unknown>) => void;
	readonly onDirtyChange?: (isDirty: boolean) => void;
	readonly customComponents?: Record<string, React.FC<Record<string, unknown>>>;
	readonly onFieldValueChange?: (
		fieldname: string,
		value: unknown,
		formApi: FormBuilderRef,
	) => void;
	readonly onBeforeStepChange?: (
		currentIndex: number,
		nextIndex: number,
		values: Record<string, unknown>,
		formApi: FormBuilderRef,
	) => Promise<boolean | string>;
	readonly className?: string;
};

export interface FormBuilderRef {
	setFieldValue: (fieldname: string, value: unknown) => void;
	setValues: (values: Record<string, unknown>) => void;
	getValues: () => Record<string, unknown>;
	reset: () => void;
}

// ... (rest of the file until FormBuilder component)

export const FormBuilder = React.forwardRef<FormBuilderRef, TFormBuilderProps>(
	(
		{
			doctype,
			initialValues,
			mode = "create",
			onSubmit,
			onCancel,
			onChange,
			onDirtyChange,
			customComponents,
			onFieldValueChange,
			onBeforeStepChange,
			className,
		},
		ref,
	) => {
		// State
		const [values, setValues] = useState<Record<string, unknown>>(
			getInitialValues(doctype, initialValues),
		);
		const [linkedDocs, setLinkedDocs] = useState<
			Record<string, Record<string, unknown>>
		>({});
		const [errors, setErrors] = useState<TFormFieldErrors>({});
		const [touched, setTouched] = useState<Record<string, boolean>>({});
		const [isSubmitting, setIsSubmitting] = useState(false);
		const [isDirty, setIsDirty] = useState(false);
		const [currentStepIndex, setCurrentStepIndex] = useState(0);
		const { t } = useTranslation();

		const formApi = useMemo<FormBuilderRef>(
			() => ({
				setFieldValue: (fieldname, value) => {
					setValues((prev) => ({ ...prev, [fieldname]: value }));
				},
				setValues: (newValues) => {
					setValues((prev) => ({ ...prev, ...newValues }));
				},
				getValues: () => values,
				reset: () => {
					setValues(getInitialValues(doctype, initialValues));
					setErrors({});
					setTouched({});
					setIsDirty(false);
					setCurrentStepIndex(0);
				},
			}),
			[values, doctype, initialValues],
		);

		useImperativeHandle(ref, () => formApi);

		// Computed
		const isViewMode = mode === "view";

		// Parse steps and sections
		const stepsData = useMemo(() => {
			const stepsArray: Array<{
				step: TFieldSchema | null;
				sections: Array<{
					section: TFieldSchema | null;
					fields: TFieldSchema[];
				}>;
			}> = [];

			let currentStep: TFieldSchema | null = null;
			let currentSection: TFieldSchema | null = null;
			let currentFields: TFieldSchema[] = [];
			let currentSections: Array<{
				section: TFieldSchema | null;
				fields: TFieldSchema[];
			}> = [];

			const pushSection = () => {
				if (currentSection || currentFields.length > 0) {
					currentSections.push({
						section: currentSection,
						fields: currentFields,
					});
				}
				currentFields = [];
				currentSection = null;
			};

			const pushStep = () => {
				pushSection();
				if (currentStep || currentSections.length > 0) {
					stepsArray.push({ step: currentStep, sections: currentSections });
				}
				currentSections = [];
				currentStep = null;
			};

			for (const field of doctype.fields) {
				if (field.fieldtype === "step_break") {
					pushStep();
					currentStep = field;
				} else if (field.fieldtype === "section_break") {
					pushSection();
					currentSection = field;
				} else if (field.fieldtype === "column_break") {
					// Ignore for now
				} else {
					currentFields.push(field);
				}
			}

			pushStep();
			return stepsArray;
		}, [doctype.fields]);

		const isWizard = stepsData.length > 1;

		// Effects
		useEffect(() => {
			if (onChange && isDirty) {
				onChange(values);
			}
		}, [values, isDirty, onChange]);

		useEffect(() => {
			onDirtyChange?.(isDirty);
		}, [isDirty, onDirtyChange]);

		// Evaluate formulas
		useEffect(() => {
			const formulaFields = doctype.fields.filter((f) => f.formula);
			if (formulaFields.length === 0) return;

			let hasChanges = false;
			const nextValues = { ...values };

			formulaFields.forEach((field) => {
				const evaluated = evaluateFormula(field.formula, values);
				// Update only if evaluated is valid and different
				if (
					evaluated !== undefined &&
					!Number.isNaN(evaluated) &&
					evaluated !== nextValues[field.fieldname]
				) {
					nextValues[field.fieldname] = evaluated;
					hasChanges = true;
				}
			});

			if (hasChanges) {
				setValues(nextValues);
			}
		}, [values, doctype.fields]);

		// Evaluate fetch_from
		useEffect(() => {
			const fetchFromFields = doctype.fields.filter((f) => f.fetch_from);
			if (fetchFromFields.length === 0) return;

			let hasChanges = false;
			const nextValues = { ...values };

			fetchFromFields.forEach((field) => {
				const parts = field.fetch_from?.split(".");
				if (parts?.length === 2) {
					const linkField = parts[0];
					const targetProp = parts[1];
					if (linkField && targetProp) {
						const linkedDoc = linkedDocs[linkField];
						if (linkedDoc && linkedDoc[targetProp] !== undefined) {
							if (nextValues[field.fieldname] !== linkedDoc[targetProp]) {
								nextValues[field.fieldname] = linkedDoc[targetProp];
								hasChanges = true;
							}
						}
					}
				}
			});

			if (hasChanges) {
				setValues(nextValues);
			}
		}, [values, linkedDocs, doctype.fields]);

		// Handlers
		const handleChange = useCallback(
			(fieldname: string, value: unknown, option?: unknown) => {
				setValues((prev) => {
					const newValues = { ...prev, [fieldname]: value };

					// Fire the onFieldValueChange hook right after state calculation
					if (onFieldValueChange) {
						const tempApi: FormBuilderRef = {
							setFieldValue: (fname, fvalue) =>
								setValues((v) => ({ ...v, [fname]: fvalue })),
							setValues: (nValues) => setValues((v) => ({ ...v, ...nValues })),
							getValues: () => newValues, // Using updated values
							reset: () => {},
						};
						// Execute asynchronously so it doesn't block state update
						setTimeout(() => {
							onFieldValueChange(fieldname, value, tempApi);
						}, 0);
					}

					return newValues;
				});

				setIsDirty(true);

				if (option && typeof option === "object" && "doc" in option) {
					setLinkedDocs((prev) => ({
						...prev,
						[fieldname]: (option as { doc: Record<string, unknown> }).doc,
					}));
				}

				// Clear error when value changes
				if (errors[fieldname]) {
					setErrors((prev) => {
						const next = { ...prev };
						delete next[fieldname];
						return next;
					});
				}
			},
			[errors, onFieldValueChange],
		);

		const handleBlur = useCallback((fieldname: string) => {
			setTouched((prev) => ({ ...prev, [fieldname]: true }));
		}, []);

		const handleNext = async (e: React.MouseEvent) => {
			e.preventDefault();

			const currentStepFields =
				stepsData[currentStepIndex]?.sections.flatMap((s) =>
					s.fields.map((f) => f.fieldname),
				) || [];
			const result = validateForm(doctype, values, currentStepFields);

			setErrors((prev) => {
				const next = { ...prev };
				currentStepFields.forEach((f) => {
					delete next[f];
				});
				return { ...next, ...result.errors };
			});

			const stepTouched: Record<string, boolean> = {};
			currentStepFields.forEach((f) => {
				stepTouched[f] = true;
			});
			setTouched((prev) => ({ ...prev, ...stepTouched }));

			if (!result.valid) {
				toast.error(t("common.validation_error_title"), {
					description: t("common.validation_error_desc"),
				});
				return;
			}

			// Async Step Validation Hook
			if (onBeforeStepChange) {
				setIsSubmitting(true);
				try {
					// We need to pass the FormBuilderRef. We can create a temporary API object.
					const tempApi: FormBuilderRef = {
						setFieldValue: (fieldname, value) =>
							setValues((prev) => ({ ...prev, [fieldname]: value })),
						setValues: (newValues) =>
							setValues((prev) => ({ ...prev, ...newValues })),
						getValues: () => values,
						reset: () => {},
					};
					const canProceed = await onBeforeStepChange(
						currentStepIndex,
						currentStepIndex + 1,
						values,
						tempApi,
					);
					if (typeof canProceed === "string") {
						toast.error(t("common.error_title"), { description: canProceed });
						return;
					}
					if (!canProceed) return;
				} catch (err) {
					toast.error(t("common.error_title"), {
						description: extractErrorMessage(err, "Step validation failed"),
					});
					return;
				} finally {
					setIsSubmitting(false);
				}
			}

			setCurrentStepIndex((prev) => prev + 1);
		};

		const handlePrev = (e: React.MouseEvent) => {
			e.preventDefault();
			setCurrentStepIndex((prev) => Math.max(0, prev - 1));
		};

		const handleSubmit = useCallback(
			async (e: React.FormEvent) => {
				e.preventDefault();

				// Validate all
				const result = validateForm(doctype, values);
				setErrors(result.errors);

				const allTouched: Record<string, boolean> = {};
				for (const field of doctype.fields) {
					allTouched[field.fieldname] = true;
				}
				setTouched(allTouched);

				if (!result.valid) {
					toast.error(t("common.validation_error_title"), {
						description: t("common.validation_error_desc"),
					});
					return;
				}

				if (!onSubmit) return;

				setIsSubmitting(true);
				try {
					const response = await onSubmit(values);
					devLog.debug("FormBuilder onSubmit response", response);
					if (response.error) {
						toast.error(t("common.error_title"), {
							description: extractErrorMessage(
								response.message,
								t("common.error"),
							),
						});
					} else {
						toast.success(t("common.success_title"), {
							description: response.message ?? t("common.success"),
						});
						setIsDirty(false);
					}
				} catch (_error) {
					toast.error(t("common.error_title"), {
						description: extractErrorMessage(_error, t("common.error")),
					});
				} finally {
					setIsSubmitting(false);
				}
			},
			[doctype, values, onSubmit, t],
		);

		const activeStep = stepsData[currentStepIndex];

		return (
			<form
				onSubmit={handleSubmit}
				className={cn("space-y-6", className)}
				noValidate
			>
				{/* Stepper UI */}
				{isWizard && (
					<div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
						{stepsData.map((stepData, index) => {
							const isActive = index === currentStepIndex;
							const isCompleted = index < currentStepIndex;
							return (
								<div
									key={stepData.step?.fieldname || index}
									className="flex items-center flex-shrink-0"
								>
									<div className="flex flex-col items-center">
										<div
											className={cn(
												"w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
												isActive
													? "border-emerald-500 bg-emerald-500 text-white"
													: isCompleted
														? "border-emerald-500 bg-emerald-50 text-emerald-600"
														: "border-neutral-200 text-neutral-400 bg-white",
											)}
										>
											{index + 1}
										</div>
										<span
											className={cn(
												"text-[11px] mt-2 font-medium uppercase tracking-wider",
												isActive || isCompleted
													? "text-neutral-900"
													: "text-neutral-400",
											)}
										>
											{stepData.step?.label ||
												`${t("common.step")} ${index + 1}`}
										</span>
									</div>
									{index < stepsData.length - 1 && (
										<div
											className={cn(
												"h-[2px] w-12 md:w-24 mx-2 md:mx-4 -translate-y-3 rounded-full transition-colors",
												isCompleted ? "bg-emerald-500" : "bg-neutral-100",
											)}
										/>
									)}
								</div>
							);
						})}
					</div>
				)}

				{/* Render Sections for Active Step */}
				{activeStep?.sections.map((section, sectionIndex) => (
					<motion.div
						key={
							section.section?.fieldname ??
							`section-${currentStepIndex}-${sectionIndex}`
						}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: sectionIndex * 0.05 }}
						className="bg-transparent rounded-none border-none "
					>
						{/* Section Header */}
						{section.section?.label && (
							<div className="py-4">
								<h3 className="text-lg font-semibold text-ink-black">
									{section.section.label}
								</h3>
								{section.section.description && (
									<p className="text-sm text-neutral-500 mt-1">
										{section.section.description}
									</p>
								)}
							</div>
						)}

						{/* Fields */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{section.fields.map((field) => {
								// Check visibility
								if (field.hidden) return null;
								const isVisible = evaluateDependsOn(field.depends_on, values);
								if (!isVisible) return null;

								return (
									<FieldRenderer
										key={field.fieldname}
										field={field}
										value={values[field.fieldname]}
										error={errors[field.fieldname] || undefined}
										touched={touched[field.fieldname]}
										disabled={isViewMode}
										onChange={handleChange}
										onBlur={handleBlur}
										values={values}
										customComponents={customComponents}
										formApi={formApi}
									/>
								);
							})}
						</div>
					</motion.div>
				))}

				{/* Actions */}
				{!isViewMode && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.2 }}
						className="flex flex-col gap-3 pt-6 mt-8 border-t border-neutral-100"
					>
						{isWizard && currentStepIndex < stepsData.length - 1 ? (
							<Button
								type="button"
								onClick={handleNext}
								className="w-full h-11 text-[15px]"
							>
								{t("common.next")}
							</Button>
						) : (
							<Button
								type="submit"
								disabled={isSubmitting}
								className="w-full h-11 text-[15px]"
							>
								{isSubmitting ? (
									<span className="flex items-center justify-center gap-2">
										<span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
										{t("common.saving")}
									</span>
								) : (
									t("common.save")
								)}
							</Button>
						)}

						{isWizard && currentStepIndex > 0 ? (
							<Button
								type="button"
								variant="outline"
								onClick={handlePrev}
								disabled={isSubmitting}
								className="w-full h-11 text-[15px]"
							>
								{t("common.back")}
							</Button>
						) : (
							onCancel && (
								<Button
									type="button"
									variant="ghost"
									onClick={onCancel}
									disabled={isSubmitting}
									className="w-full h-11 text-[15px]"
								>
									{t("common.cancel")}
								</Button>
							)
						)}
					</motion.div>
				)}
			</form>
		);
	},
);

FormBuilder.displayName = "FormBuilder";

export default FormBuilder;
