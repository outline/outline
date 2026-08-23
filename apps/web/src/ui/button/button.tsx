import * as React from "react";
import { cn } from "@/shared/utils";
import { styles } from "./button.styles";

export type TButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	readonly variant?: keyof typeof styles.variants;
	readonly size?: keyof typeof styles.sizes;
};

export const Button = React.forwardRef<HTMLButtonElement, TButtonProps>(
	({ className, variant = "primary", size = "default", ...props }, ref) => {
		return (
			<button
				className={cn(
					styles.base,
					styles.variants[variant],
					styles.sizes[size],
					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);

Button.displayName = "Button";
