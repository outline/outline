import type * as React from "react";
import { cn } from "@/shared/utils";
import { styles } from "./card.styles";

export type TCardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = ({ className, ...props }: TCardProps) => (
	<div className={cn(styles.card, className)} {...props} />
);

export const CardHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn(styles.header, className)} {...props} />
);

export const CardTitle = ({
	className,
	...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
	<h3 className={cn(styles.title, className)} {...props} />
);

export const CardDescription = ({
	className,
	...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
	<p className={cn(styles.description, className)} {...props} />
);

export const CardContent = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn(styles.content, className)} {...props} />
);

export const CardFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div className={cn(styles.footer, className)} {...props} />
);
