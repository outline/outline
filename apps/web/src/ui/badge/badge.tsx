import type * as React from "react";
import { cn } from "@/shared/utils";
import { styles } from "./badge.styles";

export type TBadgeProps = React.HTMLAttributes<HTMLDivElement> & {
	readonly variant?: keyof typeof styles.variants;
};

export const Badge = ({
	className,
	variant = "default",
	...props
}: TBadgeProps) => {
	return (
		<div
			className={cn(styles.base, styles.variants[variant], className)}
			{...props}
		/>
	);
};
