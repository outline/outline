import { Area, AreaChart, ResponsiveContainer } from "recharts";

const data = [
	{ value: 40 },
	{ value: 30 },
	{ value: 45 },
	{ value: 25 },
	{ value: 35 },
	{ value: 15 },
	{ value: 25 },
	{ value: 20 },
	{ value: 30 },
];

export type TSparklineProps = {
	readonly color: string;
	readonly className?: string;
};

export const Sparkline = ({ color, className }: TSparklineProps) => {
	return (
		<div className={className}>
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data}>
					<defs>
						<linearGradient
							id={`gradient-${color.replace("#", "")}`}
							x1="0"
							y1="0"
							x2="0"
							y2="1"
						>
							<stop offset="5%" stopColor={color} stopOpacity={0.2} />
							<stop offset="95%" stopColor={color} stopOpacity={0} />
						</linearGradient>
					</defs>
					<Area
						type="monotone"
						dataKey="value"
						stroke={color}
						strokeWidth={2}
						fillOpacity={1}
						fill={`url(#gradient-${color.replace("#", "")})`}
						isAnimationActive={false}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
};
