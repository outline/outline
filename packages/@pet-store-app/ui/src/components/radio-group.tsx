"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { motion } from "motion/react";

import { cn } from "../utils";

const RadioGroup = React.forwardRef<
	React.ComponentRef<typeof RadioGroupPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
	return (
		<RadioGroupPrimitive.Root
			className={cn("flex flex-col gap-4", className)}
			{...props}
			ref={ref}
		/>
	);
});
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

const RadioGroupItem = React.forwardRef<
	React.ComponentRef<typeof RadioGroupPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, disabled, ...props }, ref) => {
	return (
		<motion.div
			{...(disabled ? {} : { whileTap: { scale: 0.95 }, whileHover: { scale: 1.05 } })}
			transition={{
				type: "spring",
				stiffness: 400,
				damping: 25,
			}}
		>
			<RadioGroupPrimitive.Item
				ref={ref}
				disabled={disabled}
				className={cn(
					"flex size-4 shrink-0 cursor-pointer appearance-none items-center justify-center rounded-full bg-primary ring-1 ring-neutral-300 ring-inset",
					"data-[state=checked]:bg-brand-solid data-[state=checked]:ring-brand-solid",
					"disabled:cursor-not-allowed disabled:opacity-50",
					"disabled:data-[state=unchecked]:bg-tertiary",
					"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
					className,
				)}
				{...props}
			>
				<RadioGroupPrimitive.Indicator className="flex items-center justify-center">
					<div className="size-1.5 rounded-full bg-fg-white opacity-0 transition-inherit-all data-[state=checked]:opacity-100" />
				</RadioGroupPrimitive.Indicator>
			</RadioGroupPrimitive.Item>
		</motion.div>
	);
});
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName;

const Radio = RadioGroupItem;

export { RadioGroup, RadioGroupItem, Radio };
