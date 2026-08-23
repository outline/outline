import type * as React from "react";
import {
	AltArrowDownBoldDuotone as ArrowDown,
	AltArrowUpBoldDuotone as ArrowUp,
} from "solar-icon-set";
import { cn } from "@/shared/utils";

export type TDashboardMetricProps = {
	readonly label: React.ReactNode;
	readonly value: React.ReactNode;
	readonly valueClassName?: string;
	readonly trend?: {
		readonly value: React.ReactNode;
		readonly status: "positive" | "negative" | "neutral";
	};
};

export const DashboardMetric = ({
	label,
	value,
	valueClassName,
	trend,
}: TDashboardMetricProps) => {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-[11px] text-neutral-400 font-bold uppercase tracking-tight">
				{label}
			</span>
			<div className="flex items-baseline gap-2">
				<span
					className={cn(
						"text-[22px] font-bold tracking-tighter tabular-nums text-neutral-900",
						valueClassName,
					)}
				>
					{value}
				</span>
				{trend && (
					<div
						className={cn(
							"flex items-center gap-0.5 text-[11px] font-black tracking-tighter",
							{
								"text-emerald-500": trend.status === "positive",
								"text-rose-500": trend.status === "negative",
								"text-neutral-500": trend.status === "neutral",
							},
						)}
					>
						{trend.status === "positive" && <ArrowUp className="w-3 h-3" />}
						{trend.status === "negative" && <ArrowDown className="w-3 h-3" />}
						{trend.value}
					</div>
				)}
			</div>
		</div>
	);
};

export type TDashboardMetricGroupProps = {
	readonly children: React.ReactNode;
	readonly aside?: React.ReactNode;
};

export const DashboardMetricGroup = ({
	children,
	aside,
}: TDashboardMetricGroupProps) => {
	return (
		<div className="p-4 flex flex-row items-center justify-between gap-4">
			<div className="flex flex-col gap-6 flex-1">{children}</div>
			{aside}
		</div>
	);
};
