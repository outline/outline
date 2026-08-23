import { cn } from "@/shared/utils";
import { styles } from "./empty-state.styles";

export type TEmptyStateVariant =
	| "boarding"
	| "inventory"
	| "orders"
	| "staff"
	| "branches"
	| "pos"
	| "loyalty"
	| "accounting"
	| "portal-bookings"
	| "portal-reviews"
	| "whatsapp"
	| "search";

export type TEmptyStateProps = {
	readonly variant?: TEmptyStateVariant;
	readonly icon?: React.ElementType; // Keep for backward compatibility/custom icons
	readonly title: string;
	readonly description?: string;
	readonly action?: React.ReactNode;
	readonly className?: string;
};

export const EmptyState = ({
	variant,
	icon: Icon,
	title,
	description,
	action,
	className,
}: TEmptyStateProps) => {
	const illustrationSrc = variant ? `/assets/empty/${variant}.webp` : null;

	return (
		<div className={cn(styles.container, className)}>
			<div className={styles.visualWrapper}>
				{illustrationSrc ? (
					<img
						src={illustrationSrc}
						alt=""
						className={styles.illustration}
						onError={(e) => {
							// Fallback to placeholder if image fails to load
							(e.target as HTMLImageElement).src =
								"https://placehold.co/320x320/F5F5F5/A3A3A3?text=Empty";
						}}
					/>
				) : Icon ? (
					<div className={styles.iconWrapper}>
						<Icon className={styles.icon} />
					</div>
				) : (
					<div className={styles.placeholderVisual} />
				)}
			</div>
			<div className={styles.content}>
				<h3 className={styles.title}>{title}</h3>
				{description && <p className={styles.description}>{description}</p>}
			</div>
			{action && <div className={styles.action}>{action}</div>}
		</div>
	);
};

import type * as React from "react";
