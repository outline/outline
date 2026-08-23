import type React from "react";
import { cn } from "@/shared/utils";

const InputGroup = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		data-slot="input-group"
		className={cn(
			"relative flex w-full items-center rounded-md border border-input bg-transparent  transition-colors focus-within:ring-1 focus-within:ring-ring",
			className,
		)}
		{...props}
	/>
);
InputGroup.displayName = "InputGroup";

const InputGroupInput = ({
	className,
	...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
	<input
		data-slot="input-group-input"
		className={cn(
			"flex h-9 w-full min-w-0 bg-transparent px-3 py-1 text-base placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
			className,
		)}
		{...props}
	/>
);
InputGroupInput.displayName = "InputGroupInput";

const InputGroupAddon = ({
	className,
	align = "inline-start",
	...props
}: React.HTMLAttributes<HTMLDivElement> & {
	align?: "inline-start" | "inline-end";
}) => (
	<div
		data-slot="input-group-addon"
		data-align={align}
		className={cn(
			"flex items-center gap-1 px-2 text-muted-foreground",
			align === "inline-end" && "ml-auto",
			className,
		)}
		{...props}
	/>
);
InputGroupAddon.displayName = "InputGroupAddon";

const InputGroupButton = ({
	className,
	variant: _variant = "ghost",
	size: _size = "icon-xs",
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "ghost" | "outline";
	size?: "icon-xs" | "icon-sm";
}) => (
	<button
		type="button"
		data-slot="input-group-control"
		className={cn(
			"inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-6 w-6 cursor-pointer",
			className,
		)}
		{...props}
	/>
);
InputGroupButton.displayName = "InputGroupButton";

const InputGroupText = ({
	className,
	...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
	<span
		data-slot="input-group-text"
		className={cn("flex items-center text-muted-foreground", className)}
		{...props}
	/>
);
InputGroupText.displayName = "InputGroupText";

export {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
};
