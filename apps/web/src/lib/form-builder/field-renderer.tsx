/**
 * Form Builder Field Renderer
 * Maps fieldtypes to React components
 */

import type React from "react";
import { useState } from "react";
import {
	DocumentLinear as DocumentIcon,
	EyeLinear as Eye,
	EyeClosedLinear as EyeClosed,
	GalleryLinear as GalleryIcon,
	InfoCircleLinear as InfoIcon,
	AddCircleLinear as Plus,
	TrashBinTrashLinear as Trash2,
} from "solar-icon-set";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { AsyncSelect } from "@/components/ui/async-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateTimeInput } from "@/components/ui/datetimepicker-input";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SignaturePad } from "@/components/ui/signature-pad";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLinkDoctypeOptions } from "@/lib/api/form-builder.functions";
import { cn } from "@/shared/utils";
import type { TFieldSchema } from "./types";
import { evaluateDependsOn } from "./validation";

// ============================================================================
// Field Renderer Props
// ============================================================================

export type TFieldRendererProps = {
	readonly field: TFieldSchema;
	readonly value: unknown;
	readonly error?: string | undefined;
	readonly touched?: boolean | undefined;
	readonly disabled?: boolean;
	readonly onChange: (
		fieldname: string,
		value: unknown,
		option?: unknown,
	) => void;
	readonly onBlur?: (fieldname: string) => void;
	readonly values: Record<string, unknown>;
	readonly customComponents?:
		| Record<string, React.FC<Record<string, unknown>>>
		| undefined;
	readonly formApi?: import("./form-builder").FormBuilderRef;
};

// ============================================================================
// Field Renderer Component
// ============================================================================

export const FieldRenderer: React.FC<TFieldRendererProps> = ({
	field,
	value,
	error,
	touched,
	disabled,
	onChange,
	onBlur,
	values,
	customComponents,
	formApi,
}) => {
	// Check visibility
	const isVisible = evaluateDependsOn(field.depends_on, values);
	if (!isVisible) return null;

	// Check read-only
	const isReadOnly =
		disabled ||
		field.read_only ||
		evaluateDependsOn(field.read_only_depends_on, values, true);

	const handleChange = (newValue: unknown) => {
		onChange(field.fieldname, newValue);
	};

	const handleBlur = () => {
		onBlur?.(field.fieldname);
	};

	const showError = touched && error;

	// Layout fields
	if (field.fieldtype === "section_break") {
		return (
			<div className="col-span-full">
				<h3 className="text-lg font-semibold text-ink-black border-b border-mist-gray pb-2 mb-4">
					{field.label}
				</h3>
				{field.description && (
					<p className="text-sm text-neutral-500 mb-4">{field.description}</p>
				)}
			</div>
		);
	}

	if (field.fieldtype === "column_break") {
		return <div className="col-span-full md:col-span-1" />;
	}

	if (field.fieldtype === "tab_break") {
		return null; // Handled by tab layout
	}

	// Common wrapper styles
	const colSpanMap: Record<number, string> = {
		1: "col-span-1 md:col-span-1",
		2: "col-span-1 md:col-span-2",
	};

	const wrapperClasses = cn(
		"flex flex-col gap-1.5",
		colSpanMap[field.colspan || 2] || "col-span-1 md:col-span-2",
		field.css_class,
	);

	const labelClasses = "text-[13px] font-semibold text-neutral-800 ml-1";
	const requiredMark = "text-rose-500";
	const errorClasses =
		"text-[12px] text-rose-500 font-medium ml-1 mt-1 animate-in fade-in slide-in-from-top-1";
	const descriptionClasses = "text-[12px] text-neutral-400 ml-1";

	return (
		<div className={wrapperClasses}>
			{/* Label */}
			{field.label && field.fieldtype !== "check" && (
				<div className="flex items-center justify-between gap-1.5 w-full">
					<label htmlFor={field.fieldname} className={labelClasses}>
						{field.label}
						{field.required && <span className={requiredMark}> *</span>}
					</label>
					{field.tooltip && (
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="size-5 p-0 text-neutral-400 hover:text-neutral-600"
									>
										{field.icon ? (
											<span className="text-xs">{field.icon}</span>
										) : (
											<InfoIcon className="size-3.5" />
										)}
									</Button>
								</TooltipTrigger>
								<TooltipContent side="top" className="max-w-xs">
									<p className="text-xs">{field.tooltip}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					)}
				</div>
			)}

			{/* Field */}
			{renderField(
				field,
				value,
				isReadOnly,
				handleChange,
				handleBlur,
				values,
				customComponents,
				formApi,
			)}

			{/* Description */}
			{field.description && (
				<p className={descriptionClasses}>{field.description}</p>
			)}

			{/* Error */}
			{showError && <p className={errorClasses}>{error}</p>}
		</div>
	);
};

// ============================================================================
// Field Type Renderers
// ============================================================================

// Password toggle wrapper component
const PasswordInput = ({
	field,
	value,
	isReadOnly,
	onChange,
	onBlur,
}: {
	field: TFieldSchema;
	value: unknown;
	isReadOnly: boolean;
	onChange: (value: unknown) => void;
	onBlur: () => void;
}) => {
	const [showPassword, setShowPassword] = useState(false);
	return (
		<div className="relative">
			<Input
				id={field.fieldname}
				type={showPassword ? "text" : "password"}
				value={String(value ?? "")}
				onChange={(e) => onChange(e.target.value)}
				onBlur={onBlur}
				placeholder={field.placeholder}
				disabled={isReadOnly}
				maxLength={field.max_length}
				className="pr-10"
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="absolute right-0 top-0 h-9 w-9"
				onClick={() => setShowPassword(!showPassword)}
			>
				{showPassword ? (
					<EyeClosed className="size-4" />
				) : (
					<Eye className="size-4" />
				)}
			</Button>
		</div>
	);
};

const renderField = (
	field: TFieldSchema,
	value: unknown,
	isReadOnly: boolean,
	onChange: (value: unknown) => void,
	onBlur: () => void,
	values: Record<string, unknown>,
	customComponents?: Record<string, React.FC<Record<string, unknown>>>,
	formApi?: import("./form-builder").FormBuilderRef,
): React.ReactNode => {
	const handleChange = onChange;
	switch (field.fieldtype) {
		case "text":
			return (
				<Input
					id={field.fieldname}
					type="text"
					value={String(value ?? "")}
					onChange={(e) => onChange(e.target.value)}
					onBlur={onBlur}
					placeholder={field.placeholder}
					disabled={isReadOnly}
					maxLength={field.max_length}
				/>
			);

		case "password":
			return (
				<PasswordInput
					field={field}
					value={value}
					isReadOnly={isReadOnly}
					onChange={onChange}
					onBlur={onBlur}
				/>
			);

		case "phone":
			return (
				<div className="flex bg-neutral-50 rounded-lg overflow-hidden border border-neutral-200 ring-offset-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 transition-shadow">
					<div className="flex items-center justify-center px-3 text-neutral-500 bg-neutral-100 border-r border-neutral-200 text-[13px] font-medium shrink-0">
						+62
					</div>
					<Input
						id={field.fieldname}
						type="tel"
						value={String(value ?? "")}
						onChange={(e) => {
							const val = e.target.value.replace(/\D/g, "");
							onChange(val);
						}}
						onBlur={onBlur}
						placeholder={field.placeholder}
						disabled={isReadOnly}
						maxLength={field.max_length}
						className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent rounded-none px-3"
					/>
				</div>
			);

		case "long_text":
		case "code":
		case "markdown":
			return (
				<RichTextEditor
					value={String(value ?? "")}
					onChange={onChange}
					{...(field.placeholder ? { placeholder: field.placeholder } : {})}
					disabled={isReadOnly}
					className={field.fieldtype === "code" ? "font-mono text-sm" : ""}
				/>
			);

		case "number":
		case "percent":
			return (
				<Input
					id={field.fieldname}
					type="number"
					value={value !== null && value !== undefined ? String(value) : ""}
					onChange={(e) => {
						const numValue =
							e.target.value === "" ? "" : Number(e.target.value);
						onChange(numValue);
					}}
					onBlur={onBlur}
					placeholder={field.placeholder}
					disabled={isReadOnly}
					min={field.min_value}
					max={field.max_value}
					step={
						field.fieldtype === "percent"
							? 0.01
							: field.precision
								? 10 ** -field.precision
								: 1
					}
				/>
			);

		case "currency":
			return (
				<div className="flex rounded-md border border-neutral-200 focus-within:ring-2 focus-within:ring-neutral-900 focus-within:ring-offset-2 transition-all h-10 overflow-hidden bg-white">
					<span className="flex items-center px-3 bg-neutral-100 text-neutral-500 border-r border-neutral-200 text-[14px] font-medium select-none">
						Rp
					</span>
					<input
						id={field.fieldname}
						type="text"
						value={value ? Number(value).toLocaleString("id-ID") : ""}
						onChange={(e) => {
							const val = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0;
							onChange(val);
						}}
						onBlur={onBlur}
						placeholder={field.placeholder ?? "0"}
						disabled={isReadOnly}
						className="flex-1 bg-transparent px-3 text-[14px] outline-none placeholder:text-muted-foreground min-w-0"
					/>
				</div>
			);

		case "rating":
			return (
				<div className="flex gap-1">
					{[1, 2, 3, 4, 5].map((star) => (
						<Button
							key={star}
							type="button"
							variant="ghost"
							size="icon"
							onClick={() => onChange(star)}
							disabled={isReadOnly}
							className={cn(
								"text-2xl",
								Number(value) >= star ? "text-amber-400" : "text-neutral-300",
							)}
						>
							★
						</Button>
					))}
				</div>
			);

		case "date": {
			const parseLocal = (dateStr: string) => {
				const [y, m, d] = dateStr.split("-").map(Number);
				if (!y || !m || !d) return null;
				return new Date(y, m - 1, d);
			};
			const formatLocal = (dateObj: Date) => {
				const y = dateObj.getFullYear();
				const m = String(dateObj.getMonth() + 1).padStart(2, "0");
				const d = String(dateObj.getDate()).padStart(2, "0");
				return `${y}-${m}-${d}`;
			};
			return (
				<DateTimeInput
					mode="single"
					value={value && typeof value === "string" ? parseLocal(value) : null}
					onValueChange={(date) => {
						onChange(date instanceof Date ? formatLocal(date) : null);
					}}
					placeholder={field.placeholder ?? "Pilih tanggal"}
					disabled={isReadOnly}
				/>
			);
		}

		case "date_range": {
			const parseLocal = (dateStr?: string) => {
				if (!dateStr) return undefined;
				const [y, m, d] = dateStr.split("-").map(Number);
				if (!y || !m || !d) return undefined;
				return new Date(y, m - 1, d);
			};
			const formatLocal = (dateObj: Date) => {
				const y = dateObj.getFullYear();
				const m = String(dateObj.getMonth() + 1).padStart(2, "0");
				const d = String(dateObj.getDate()).padStart(2, "0");
				return `${y}-${m}-${d}`;
			};

			const rangeValue = value as { from?: string; to?: string } | null;
			const parsedRange = rangeValue
				? {
						from: parseLocal(rangeValue.from),
						to: parseLocal(rangeValue.to),
					}
				: undefined;

			return (
				<DateTimeInput
					mode="range"
					numberOfMonths={2}
					value={
						parsedRange as import("@/components/ui/datetimepicker/datetimepicker-types").DateRange
					}
					onValueChange={(range) => {
						if (!range) {
							onChange(null);
						} else if ("from" in range) {
							onChange({
								from: range.from ? formatLocal(range.from) : undefined,
								to: range.to ? formatLocal(range.to) : undefined,
							});
						}
					}}
					placeholder={field.placeholder ?? "Check-in -> Checkout"}
					disabled={isReadOnly}
				/>
			);
		}

		case "datetime":
			return (
				<DateTimeInput
					mode="single"
					enableTime
					timeFormat="24h"
					value={value ? new Date(String(value)) : null}
					onValueChange={(date) => {
						onChange(date instanceof Date ? date.toISOString() : null);
					}}
					placeholder={field.placeholder ?? "Pilih tanggal & waktu"}
					disabled={isReadOnly}
				/>
			);

		case "time":
			return (
				<Input
					id={field.fieldname}
					type="time"
					value={String(value ?? "")}
					onChange={(e) => onChange(e.target.value)}
					onBlur={onBlur}
					disabled={isReadOnly}
				/>
			);

		case "select":
			return (
				<Select
					value={String(value ?? "")}
					onValueChange={onChange}
					disabled={isReadOnly}
				>
					<SelectTrigger id={field.fieldname}>
						<SelectValue placeholder={field.placeholder ?? "Pilih..."} />
					</SelectTrigger>
					<SelectContent>
						{field.options?.map((opt) => (
							<SelectItem key={opt.value} value={opt.value}>
								{opt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);

		case "radio":
			return (
				<RadioGroup
					value={String(value ?? "")}
					onValueChange={onChange}
					disabled={isReadOnly}
				>
					{field.options?.map((opt) => (
						<div key={opt.value} className="flex items-center gap-2">
							<RadioGroupItem
								value={opt.value}
								id={`${field.fieldname}-${opt.value}`}
							/>
							<label
								htmlFor={`${field.fieldname}-${opt.value}`}
								className="text-sm text-neutral-700 cursor-pointer"
							>
								{opt.label}
							</label>
						</div>
					))}
				</RadioGroup>
			);

		case "check":
			return (
				<div className="flex items-center gap-2">
					<Checkbox
						id={field.fieldname}
						checked={Boolean(value)}
						onCheckedChange={onChange}
						disabled={isReadOnly}
					/>
					<label
						htmlFor={field.fieldname}
						className="text-sm text-neutral-700 cursor-pointer"
					>
						{field.label}
					</label>
				</div>
			);

		case "multiselect":
			return (
				<div className="flex flex-wrap gap-2">
					{field.options?.map((opt) => {
						const selected = Array.isArray(value) && value.includes(opt.value);
						return (
							<Button
								key={opt.value}
								type="button"
								variant={selected ? "default" : "outline"}
								size="sm"
								onClick={() => {
									const current = Array.isArray(value) ? [...value] : [];
									if (selected) {
										onChange(current.filter((v) => v !== opt.value));
									} else {
										onChange([...current, opt.value]);
									}
								}}
								disabled={isReadOnly}
							>
								{opt.label}
							</Button>
						);
					})}
				</div>
			);

		case "color":
			return (
				<div className="flex items-center gap-2">
					<input
						type="color"
						value={String(value ?? "#000000")}
						onChange={(e) => onChange(e.target.value)}
						disabled={isReadOnly}
						className="w-10 h-10 rounded border border-neutral-200 cursor-pointer"
					/>
					<Input
						value={String(value ?? "")}
						onChange={(e) => onChange(e.target.value)}
						placeholder="#000000"
						disabled={isReadOnly}
						className="flex-1"
					/>
				</div>
			);

		case "signature":
			return (
				<div className="border border-neutral-200 rounded-lg overflow-hidden bg-white">
					<SignaturePad
						onChange={(dataURL) => onChange(dataURL)}
						showButtons={!isReadOnly}
						variant="ghost"
						size="sm"
					/>
					{!!value &&
						isReadOnly &&
						typeof value === "string" &&
						value.startsWith("data:image") && (
							<div className="p-2 border-t border-neutral-100 bg-neutral-50 flex justify-center">
								<img
									src={value as string}
									alt="Signature"
									className="max-h-[100px]"
								/>
							</div>
						)}
				</div>
			);

		case "image":
		case "attach": {
			const isImage = field.fieldtype === "image";
			return (
				<div className="flex flex-col gap-2">
					{!isReadOnly && (
						<div className="relative group">
							<input
								id={field.fieldname}
								type="file"
								accept={isImage ? "image/*" : undefined}
								disabled={isReadOnly}
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) {
										handleChange(file);
									}
								}}
								className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
							/>
							<div className="border-2 border-dashed border-neutral-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-neutral-50 group-hover:bg-neutral-100 group-hover:border-neutral-300 transition-colors">
								{isImage ? (
									<GalleryIcon className="size-6 text-neutral-400" />
								) : (
									<DocumentIcon className="size-6 text-neutral-400" />
								)}
								<div className="text-sm font-medium text-neutral-700">
									Klik atau tarik {isImage ? "gambar" : "file"} ke sini
								</div>
								<div className="text-xs text-neutral-500">
									{isImage ? "PNG, JPG, maksimal 5MB" : "Semua format didukung"}
								</div>
							</div>
						</div>
					)}
					{!!value && (
						<div className="flex items-center gap-3 p-3 border border-neutral-200 rounded-lg bg-white">
							{isImage && (
								<div className="w-12 h-12 rounded overflow-hidden bg-neutral-100 shrink-0">
									{value instanceof File ? (
										<img
											src={URL.createObjectURL(value)}
											alt="Preview"
											className="w-full h-full object-cover"
										/>
									) : typeof value === "string" ? (
										<img
											src={value as string}
											alt="Preview"
											className="w-full h-full object-cover"
										/>
									) : (
										<GalleryIcon className="w-full h-full p-2 text-neutral-300" />
									)}
								</div>
							)}
							<div className="flex-1 min-w-0">
								<div className="text-sm font-medium text-neutral-900 truncate">
									{value instanceof File
										? value.name
										: typeof value === "string"
											? value.split("/").pop()
											: "File terlampir"}
								</div>
								{value instanceof File && (
									<div className="text-xs text-neutral-500">
										{(value.size / 1024 / 1024).toFixed(2)} MB
									</div>
								)}
							</div>
							{!isReadOnly && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => handleChange(null)}
									className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 shrink-0"
								>
									<Trash2 className="size-4" />
								</Button>
							)}
						</div>
					)}
				</div>
			);
		}

		case "link": {
			const fetchOptions = async (search: string) => {
				if (field.options) {
					return field.options.filter((o) =>
						o.label.toLowerCase().includes(search.toLowerCase()),
					);
				}
				const bid = values.business_id as string | undefined;
				const options = await getLinkDoctypeOptions({
					data: {
						doctype: field.link_doctype ?? "",
						search,
						...(bid ? { businessId: bid } : {}),
					},
				});
				return [...options];
			};

			return (
				<AsyncSelect
					value={String(value ?? "")}
					onChange={(val) => onChange(val)}
					fetchOptions={fetchOptions}
					disabled={isReadOnly}
					placeholder={field.placeholder ?? "Cari..."}
				/>
			);
		}

		case "table": {
			const rows = Array.isArray(value)
				? (value as Record<string, unknown>[])
				: [];
			return (
				<div className="flex flex-col gap-3">
					<Accordion type="multiple" className="w-full space-y-3">
						{rows.map((row, index) => {
							const rowId = String(row._id || index);
							return (
								<AccordionItem
									key={rowId}
									value={rowId}
									className="border border-neutral-200 bg-white rounded-xl overflow-hidden shadow-sm"
								>
									<div className="flex items-center justify-between px-4 py-1 border-b border-neutral-100 bg-neutral-50/50">
										<AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-neutral-50 transition-colors">
											<div className="flex items-center justify-between w-full pr-4">
												<span className="font-semibold text-neutral-800 text-[14px]">
													Baris {index + 1}
												</span>
												<div className="flex gap-4 text-[13px] text-neutral-500 font-normal">
													{field.child_fields
														?.filter((f) => f.in_list_view)
														.map((f) => (
															<span key={f.fieldname}>
																{f.label}: {String(row[f.fieldname] || "-")}
															</span>
														))}
												</div>
											</div>
										</AccordionTrigger>
										{!isReadOnly && (
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={(e) => {
													e.stopPropagation();
													const newRows = [...rows];
													newRows.splice(index, 1);
													onChange(newRows);
												}}
												className="size-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 ml-2"
											>
												<Trash2 className="size-4" />
											</Button>
										)}
									</div>
									<AccordionContent className="p-4 bg-white">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											{field.child_fields?.map((childField) => (
												<FieldRenderer
													key={childField.fieldname}
													field={childField}
													value={row[childField.fieldname]}
													values={row}
													disabled={isReadOnly}
													onChange={(fname, fvalue) => {
														const newRows = [...rows];
														newRows[index] = {
															...newRows[index],
															[fname]: fvalue,
														};
														onChange(newRows);
													}}
													onBlur={() => onBlur()}
												/>
											))}
										</div>
									</AccordionContent>
								</AccordionItem>
							);
						})}
					</Accordion>

					{/* Summary Footer */}
					{rows.length > 0 &&
						field.child_fields?.some(
							(f) => f.fieldtype === "currency" || f.fieldtype === "number",
						) && (
							<div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex flex-col gap-2 shadow-sm">
								<div className="text-[12px] font-semibold text-neutral-500 uppercase tracking-wider mb-1">
									Ringkasan Total
								</div>
								{field.child_fields
									.filter(
										(f) =>
											f.fieldtype === "currency" || f.fieldtype === "number",
									)
									.map((f) => {
										const total = rows.reduce(
											(sum, r) => sum + (Number(r[f.fieldname]) || 0),
											0,
										);
										return (
											<div
												key={f.fieldname}
												className="flex justify-between items-center"
											>
												<span className="text-[13px] text-neutral-600 font-medium">
													{f.label}
												</span>
												<span className="text-[14px] font-bold text-neutral-900">
													{f.fieldtype === "currency"
														? `Rp ${total.toLocaleString("id-ID")}`
														: total.toLocaleString("id-ID")}
												</span>
											</div>
										);
									})}
							</div>
						)}

					{!isReadOnly && (
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								const newRows = [...rows, { _id: crypto.randomUUID() }];
								onChange(newRows);
							}}
							className="w-full flex items-center justify-center gap-2 border-dashed border-2 py-6 text-neutral-500 hover:text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
						>
							<Plus className="size-5" />
							Tambah Baris
						</Button>
					)}
				</div>
			);
		}

		case "custom_component": {
			if (customComponents?.[field.fieldname]) {
				const CustomComponent = customComponents[
					field.fieldname
				] as React.ElementType;
				return (
					<CustomComponent
						value={value}
						onChange={(val: unknown) => onChange(val)}
						disabled={isReadOnly}
						field={field}
						values={values}
						formApi={formApi}
					/>
				);
			}
			return (
				<div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-lg">
					Custom component for <strong>{field.fieldname}</strong> not provided.
				</div>
			);
		}

		default:
			return (
				<Input
					id={field.fieldname}
					value={String(value ?? "")}
					onChange={(e) => onChange(e.target.value)}
					onBlur={onBlur}
					placeholder={field.placeholder}
					disabled={isReadOnly}
				/>
			);
	}
};
