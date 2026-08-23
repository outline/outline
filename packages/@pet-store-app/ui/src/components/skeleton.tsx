import { cn } from "../utils";

function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("animate-pulse rounded-md bg-neutral-200/80", className)}
			{...props}
		/>
	);
}

export { Skeleton };
