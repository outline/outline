import type * as React from "react";
import { cn } from "@/shared/utils";

export type TDashboardCardProps = {
	readonly title: React.ReactNode;
	readonly icon?: React.ElementType | undefined;
	readonly headerAction?: React.ReactNode | undefined;
	readonly children: React.ReactNode;
	readonly footer?: React.ReactNode | undefined;
	readonly className?: string | undefined;
	readonly contentClassName?: string | undefined;
};

export const DashboardCard = ({
	title,
	icon: Icon,
	headerAction,
	children,
	footer,
	className,
	contentClassName,
}: TDashboardCardProps) => {
	return (
		<div
			className={cn(
				"bg-neutral-200/40 rounded-lg border border-neutral-200 overflow-hidden flex flex-col h-full transition-all hover:border-neutral-300 group ",
				className,
			)}
		>
			{/* Header */}
			<div className="px-4 py-2 flex items-center justify-between bg-transparent min-h-[40px]">
				<div className="text-[12px] font-semibold text-neutral-500 flex items-center gap-2">
					{Icon && <Icon className="w-4 h-4 text-neutral-300" />}
					{title}
				</div>
				{headerAction}
			</div>

			{/* Nested Content Card */}
			<div className="flex-1 flex flex-col">
				<div
					className={cn(
						"flex-1 bg-white border-t border-neutral-200 rounded-t-lg  overflow-hidden",
						contentClassName,
					)}
				>
					{children}
				</div>
			</div>

			{/* Footer */}
			{footer && (
				<div className="px-4 py-2 flex items-center justify-between bg-neutral-50/50 border-t border-neutral-100">
					{footer}
				</div>
			)}
		</div>
	);
};
