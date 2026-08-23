import { cn } from "@/shared/utils";
import { styles } from "./status-badge.styles";

export type TStatusType = "success" | "warning" | "error" | "info" | "neutral";

export type TStatusBadgeProps = {
	readonly type: TStatusType;
	readonly label: string;
	readonly icon?: React.ElementType;
	readonly className?: string;
};

export const StatusBadge = ({
	type,
	label,
	icon: Icon,
	className,
}: TStatusBadgeProps) => {
	return (
		<div className={cn(styles.badge, styles.types[type], className)}>
			{Icon && <Icon className={styles.icon} />}
			<span className={styles.label}>{label}</span>
		</div>
	);
};

import type * as React from "react";
