import type * as React from "react";
import { CheckCircleLinear as Check } from "solar-icon-set";
import { cn } from "@/shared/utils";
import { styles } from "./success-state.styles";

export type TSuccessStateVariant =
	| "boarding"
	| "inventory"
	| "orders"
	| "staff"
	| "default";

export type TSuccessStateProps = {
	readonly variant?: TSuccessStateVariant;
	readonly icon?: React.ElementType;
	readonly title: string;
	readonly description?: string;
	readonly action?: React.ReactNode;
	readonly className?: string;
};

export const SuccessState = ({
	variant = "default",
	icon: Icon,
	title,
	description,
	action,
	className,
}: TSuccessStateProps) => {
	// If variant is 'default' we don't try to load a custom illustration unless one is explicitly added in the future
	const illustrationSrc =
		variant !== "default" ? `/assets/success/${variant}.webp` : null;

	return (
		<div className={cn(styles.container, className)}>
			{illustrationSrc ? (
				<div className={styles.illustrationWrapper}>
					<img
						src={illustrationSrc}
						alt=""
						className={styles.illustration}
						onError={(e) => {
							(e.target as HTMLImageElement).style.display = "none";
						}}
					/>
				</div>
			) : (
				<div className={styles.iconWrapper}>
					{Icon ? (
						<Icon className={styles.icon} />
					) : (
						<Check className={styles.icon} />
					)}
				</div>
			)}

			<h2 className={styles.title}>{title}</h2>
			{description && <p className={styles.description}>{description}</p>}

			{action && <div className={styles.action}>{action}</div>}
		</div>
	);
};
