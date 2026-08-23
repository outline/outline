"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { motion } from "motion/react";

import { cn } from "../utils";

export function Checkbox({
	className,
	checked: checkedProp,
	onCheckedChange: setCheckedProp,
	disabled,
	defaultChecked,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	const [_checked, _setChecked] = React.useState<
		CheckboxPrimitive.CheckedState
	>(defaultChecked ?? false);

	const checked = checkedProp ?? _checked;

	const setChecked = React.useCallback(
		(
			value:
				| CheckboxPrimitive.CheckedState
				| ((
						value: CheckboxPrimitive.CheckedState,
				) => boolean),
		) => {
			const checkedState =
				typeof value === "function" ? value(checked) : value;
			if (setCheckedProp) {
				setCheckedProp(checkedState);
			} else {
				_setChecked(checkedState);
			}
		},
		[setCheckedProp, checked],
	);

	return (
		<motion.div
			{...(disabled ? {} : { whileTap: { scale: 0.95 }, whileHover: { scale: 1.05 } })}
			transition={{
				type: "spring",
				stiffness: 400,
				damping: 25,
			}}
		>
			<CheckboxPrimitive.Root
				checked={checked}
				onCheckedChange={(value) => setChecked(!!value)}
				disabled={disabled}
				className={cn(
					"relative flex size-4 shrink-0 cursor-pointer appearance-none items-center justify-center rounded-[2px] bg-primary ring-1 ring-neutral-300 ring-inset",
					"data-[state=checked]:bg-brand-solid data-[state=checked]:ring-brand-solid",
					"disabled:cursor-not-allowed disabled:opacity-50",
					"disabled:data-[state=unchecked]:bg-tertiary",
					"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
					className,
				)}
				{...props}
			>
				<motion.svg
					className="pointer-events-none absolute size-3 text-fg-white opacity-0 transition-inherit-all"
					viewBox="0 0 12 12"
					fill="none"
					initial={false}
					style={{ scale: 1, opacity: 1 }}
				>
					<motion.path
						d="M2.5 6L4.5 8L9.5 3"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						fill="none"
						initial={checked ? "checked" : "unchecked"}
						animate={checked ? "checked" : "unchecked"}
						variants={{
							checked: {
								pathLength: 1,
								strokeDasharray: "1 1",
								opacity: 1,
								transition: {
									pathLength: {
										duration: 0.2,
										ease: "easeInOut",
										delay: 0.1,
									},
									strokeDasharray: {
										duration: 0.2,
										ease: "easeInOut",
										delay: 0.1,
									},
									opacity: {
										duration: 0.1,
										ease: "easeInOut",
									},
								},
							},
							unchecked: {
								pathLength: 0,
								strokeDasharray: "0 1",
								opacity: 0,
								transition: {
									pathLength: {
										duration: 0.3,
										ease: "easeInOut",
									},
									strokeDasharray: {
										duration: 0.3,
										ease: "easeInOut",
										delay: 0.1,
									},
									opacity: {
										duration: 0.3,
										ease: "easeInOut",
										delay: 0.1,
									},
								},
							},
						}}
					/>
				</motion.svg>
			</CheckboxPrimitive.Root>
		</motion.div>
	);
}
