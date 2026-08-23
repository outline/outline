import { ChartBoldDuotone as ChartIcon } from "solar-icon-set";
import { formatCompactCurrency } from "@/shared/utils/format";
import { DashboardCard } from "@/ui";
import { styles } from "./RevenueTrendChart.styles";

export type TRevenueTrendChartProps = {
	readonly trend: readonly {
		readonly month: string;
		readonly amount: number;
	}[];
};

export const RevenueTrendChart = ({ trend }: TRevenueTrendChartProps) => {
	const max = Math.max(...trend.map((t) => t.amount), 1);

	return (
		<DashboardCard title="Tren Pendapatan (6 Bulan)" icon={ChartIcon}>
			<div className="p-6 pt-4">
				<div className={styles.chart}>
					{trend.map((item) => {
						const height = (item.amount / max) * 100;
						return (
							<div key={item.month} className={styles.barContainer}>
								<div className={styles.barValue}>
									{item.amount > 0
										? formatCompactCurrency(item.amount, "id")
										: "0"}
								</div>
								<div
									className={styles.bar}
									style={{ height: `${Math.max(height, 4)}%` }}
								/>
								<div className={styles.barLabel}>{item.month}</div>
							</div>
						);
					})}
				</div>
			</div>
		</DashboardCard>
	);
};
