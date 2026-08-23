"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as React from "react";
import {
	CheckCircleLinear as Check,
	AltArrowRightLinear as ChevronRight,
	RecordCircleLinear as Circle,
} from "solar-icon-set";

import { cn } from "../utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

interface DropdownMenuSubTriggerProps
	extends React.ComponentPropsWithoutRef<
		typeof DropdownMenuPrimitive.SubTrigger
	> {
	inset?: boolean;
	chevronIcon?: React.ReactNode;
}

const DropdownMenuSubTrigger = React.forwardRef<
	React.ComponentRef<typeof DropdownMenuPrimitive.SubTrigger>,
	DropdownMenuSubTriggerProps
>(({ className, inset, children, chevronIcon, ...props }, ref) => (
	<DropdownMenuPrimitive.SubTrigger
		ref={ref}
		className={cn(
			"relative flex w-full cursor-default select-none items-center rounded-md py-1.5 px-2.5 text-[13px] outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-none",
			"text-foreground",
			inset && "pl-8",
			className,
		)}
		{...props}
	>
		{children}
		{chevronIcon ?? (
			<ChevronRight
				className="ml-auto size-4 shrink-0"
				aria-hidden="true"
			/>
		)}
	</DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName =
	DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
	React.ComponentRef<typeof DropdownMenuPrimitive.SubContent>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, collisionPadding = 8, ...props }, ref) => (
	<DropdownMenuPrimitive.SubContent
		ref={ref}
		collisionPadding={collisionPadding}
		className={cn(
			"relative z-50 overflow-hidden rounded-md border p-1 /[2.5%] ",
			"min-w-32",
			"max-h-[var(--radix-popper-available-height)]",
			"bg-popover",
			"text-popover-foreground",
			"will-change-[transform,opacity]",
			"data-[state=closed]:animate-hide",
			"data-[side=bottom]:animate-slide-down-and-fade data-[side=left]:animate-slide-left-and-fade data-[side=right]:animate-slide-right-and-fade data-[side=top]:animate-slide-up-and-fade",
			"p-1.5 space-y-0.5",
			className,
		)}
		{...props}
	/>
));
DropdownMenuSubContent.displayName =
	DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
	React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(
	(
		{
			className,
			sideOffset = 8,
			collisionPadding = 8,
			align = "center",
			loop = true,
			...props
		},
		ref,
	) => (
		<DropdownMenuPrimitive.Portal>
			<DropdownMenuPrimitive.Content
				ref={ref}
				sideOffset={sideOffset}
				collisionPadding={collisionPadding}
				align={align}
				loop={loop}
				className={cn(
					"relative z-50 overflow-hidden rounded-md border p-1 /[2.5%] ",
					"min-w-48",
					"max-h-[var(--radix-popper-available-height)]",
					"bg-popover",
					"text-popover-foreground",
					"will-change-[transform,opacity]",
					"data-[state=closed]:animate-hide",
					"data-[side=bottom]:animate-slide-down-and-fade data-[side=left]:animate-slide-left-and-fade data-[side=right]:animate-slide-right-and-fade data-[side=top]:animate-slide-up-and-fade",
					"p-1.5 space-y-0.5",
					className,
				)}
				{...props}
			/>
		</DropdownMenuPrimitive.Portal>
	),
);
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
	React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
		inset?: boolean;
		shortcut?: string;
		hint?: string;
	}
>(({ className, inset, shortcut, hint, children, ...props }, ref) => (
	<DropdownMenuPrimitive.Item
		ref={ref}
		className={cn(
			"relative flex w-full cursor-default select-none items-center rounded-md py-1.5 px-2.5 text-[13px] outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-none",
			"text-foreground",
			inset && "pl-8",
			className,
		)}
		{...props}
	>
		{children}
		{hint && (
			<span className="ml-auto pl-4 text-muted-foreground text-[11px]">
				{hint}
			</span>
		)}
		{shortcut && (
			<span className="ml-auto pl-4 text-muted-foreground font-mono text-[10px] tracking-widest">
				{shortcut}
			</span>
		)}
	</DropdownMenuPrimitive.Item>
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

interface DropdownMenuCheckboxItemProps
	extends React.ComponentPropsWithoutRef<
		typeof DropdownMenuPrimitive.CheckboxItem
	> {
	shortcut?: string;
	hint?: string;
	checkIcon?: React.ReactNode;
}

const DropdownMenuCheckboxItem = React.forwardRef<
	React.ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
	DropdownMenuCheckboxItemProps
>(
	(
		{ className, children, checked, shortcut, hint, checkIcon, ...props },
		ref,
	) => (
		<DropdownMenuPrimitive.CheckboxItem
			ref={ref}
			className={cn(
				"relative flex w-full cursor-default select-none items-center rounded-md py-1.5 px-2.5 text-[13px] outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-none",
				"text-foreground",
				className,
			)}
			{...(checked !== undefined ? { checked } : {})}
			{...props}
		>
			<span className="mr-2.5 flex size-4 shrink-0 items-center justify-center">
				<DropdownMenuPrimitive.ItemIndicator>
					{checkIcon ?? (
						<Check
							className="size-full shrink-0 text-foreground"
							aria-hidden="true"
						/>
					)}
				</DropdownMenuPrimitive.ItemIndicator>
			</span>
			{children}
			{hint && (
				<span className="ml-auto pl-4 text-muted-foreground text-[11px]">
					{hint}
				</span>
			)}
			{shortcut && (
				<span className="ml-auto pl-4 text-muted-foreground font-mono text-[10px] tracking-widest">
					{shortcut}
				</span>
			)}
		</DropdownMenuPrimitive.CheckboxItem>
	),
);
DropdownMenuCheckboxItem.displayName =
	DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
	React.ComponentRef<typeof DropdownMenuPrimitive.RadioItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> & {
		shortcut?: string;
		hint?: string;
	}
>(({ className, children, shortcut, hint, ...props }, ref) => (
	<DropdownMenuPrimitive.RadioItem
		ref={ref}
		className={cn(
			"relative flex w-full cursor-default select-none items-center rounded-md py-1.5 px-2.5 text-[13px] outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-none",
			"text-foreground",
			className,
		)}
		{...props}
	>
		<span className="mr-2.5 flex size-4 shrink-0 items-center justify-center">
			<DropdownMenuPrimitive.ItemIndicator>
				<Circle
					className="size-2 fill-current text-primary"
					aria-hidden="true"
				/>
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
		{children}
		{hint && (
			<span className="ml-auto pl-4 text-muted-foreground text-[11px]">
				{hint}
			</span>
		)}
		{shortcut && (
			<span className="ml-auto pl-4 text-muted-foreground font-mono text-[10px] tracking-widest">
				{shortcut}
			</span>
		)}
	</DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
	React.ComponentRef<typeof DropdownMenuPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
		inset?: boolean;
	}
>(({ className, inset, ...props }, ref) => (
	<DropdownMenuPrimitive.Label
		ref={ref}
		className={cn(
			"px-2 py-2 font-medium text-xs tracking-wide",
			"text-muted-foreground",
			inset && "pl-8",
			className,
		)}
		{...props}
	/>
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
	React.ComponentRef<typeof DropdownMenuPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.Separator
		ref={ref}
		className={cn("-mx-1 my-1 h-px border-border border-t", className)}
		{...props}
	/>
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
	className,
	...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			className={cn(
				"ml-auto pl-4 text-muted-foreground font-mono text-[10px] tracking-widest",
				className,
			)}
			{...props}
		/>
	);
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuGroup,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuRadioGroup,
	type DropdownMenuSubTriggerProps,
	type DropdownMenuCheckboxItemProps,
};
