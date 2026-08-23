import { cn } from "@/lib/utils";

export const Logo = (props: { className?: string; uniColor?: boolean }) => {
	return (
		<div className="flex items-center gap-2">
			<LogoIcon {...props} />
			<span className="font-bold text-xl tracking-tight text-foreground">
				Petso
			</span>
		</div>
	);
};

export const LogoIcon = ({
	className,
	uniColor,
}: {
	className?: string;
	uniColor?: boolean;
}) => {
	return (
		<svg
			className={cn("size-6", className)}
			viewBox="0 0 180 220"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<title>Logo Icon</title>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M80 100H28C12.536 100 0 87.464 0 72V28C0 12.536 12.536 0 28 0H72C87.464 0 100 12.536 100 28V80H160C171.046 80 180 88.9543 180 100V167.639C180 175.215 175.72 182.14 168.944 185.528L103.416 218.292C101.17 219.415 98.6923 220 96.1803 220C87.2442 220 80 212.756 80 203.82V100ZM28 20C23.5817 20 20 23.5817 20 28V72C20 76.4183 23.5817 80 28 80H80V28C80 23.5817 76.4183 20 72 20H28ZM100 100H152C156.418 100 160 103.582 160 108V165.092C160 168.103 158.309 170.859 155.625 172.224L111.625 194.591C106.303 197.296 100 193.429 100 187.459V100Z"
				fill={uniColor ? "currentColor" : "url(#paint_logo)"}
			/>
			<defs>
				<linearGradient
					id="paint_logo"
					x1="90"
					y1="0"
					x2="90"
					y2="220"
					gradientUnits="userSpaceOnUse"
				>
					<stop stopColor="#9B99FE" />
					<stop offset="1" stopColor="#2BC8B7" />
				</linearGradient>
			</defs>
		</svg>
	);
};
