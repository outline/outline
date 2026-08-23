import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
	CheckCircleLinear as CheckCircle,
	AltArrowDownLinear as AltArrowDown,
	AltArrowUpLinear as AltArrowUp,
} from "solar-icon-set";

import { cn } from "@/shared/utils";

function Select({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
	return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
	return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
	...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
	return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			className={cn(
				"relative flex w-full cursor-pointer items-center rounded-lg bg-background border border-input  outline-hidden transition duration-100 ease-linear",
				"py-2 px-3 gap-2 text-md",
				"focus:ring-1 focus:ring-ring data-[state=open]:ring-1 data-[state=open]:ring-ring",
				"disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		>
			{children}
			<SelectPrimitive.Icon asChild>
				<AltArrowDown
					className="ml-auto shrink-0 size-4 text-fg-quaternary"
				/>
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	);
}

function SelectContent({
	className,
	children,
	position = "popper",
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				data-slot="select-content"
				className={cn(
					"relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg border bg-popover text-popover-foreground ",
					"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
					position === "popper" &&
						"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
					className,
				)}
				position={position}
				{...props}
			>
				<SelectScrollUpButton />
				<SelectPrimitive.Viewport
					className={cn(
						"p-1.5 space-y-0.5",
						position === "popper" &&
							"h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
					)}
				>
					{children}
				</SelectPrimitive.Viewport>
				<SelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	);
}

function SelectLabel({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
	return (
		<SelectPrimitive.Label
			data-slot="select-label"
			className={cn("px-2 py-1.5 text-sm font-medium", className)}
			{...props}
		/>
	);
}

function SelectItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				"relative flex w-full cursor-default select-none items-center rounded-md py-1.5 px-2.5 text-[13px] outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-none",
				"text-foreground",
				className,
			)}
			{...props}
		>
			<span className="mr-2.5 flex size-4 items-center justify-center shrink-0">
				<SelectPrimitive.ItemIndicator className="w-full h-full flex items-center justify-center">
					<CheckCircle className="size-4" />
				</SelectPrimitive.ItemIndicator>
			</span>
			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		</SelectPrimitive.Item>
	);
}

function SelectSeparator({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
	return (
		<SelectPrimitive.Separator
			data-slot="select-separator"
			className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
			{...props}
		/>
	);
}

function SelectScrollUpButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
	return (
		<SelectPrimitive.ScrollUpButton
			data-slot="select-scroll-up-button"
			className={cn("flex cursor-default items-center justify-center py-1", className)}
			{...props}
		>
			<AltArrowUp className="size-4" />
		</SelectPrimitive.ScrollUpButton>
	);
}

function SelectScrollDownButton({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
	return (
		<SelectPrimitive.ScrollDownButton
			data-slot="select-scroll-down-button"
			className={cn("flex cursor-default items-center justify-center py-1", className)}
			{...props}
		>
			<AltArrowDown className="size-4" />
		</SelectPrimitive.ScrollDownButton>
	);
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
};
