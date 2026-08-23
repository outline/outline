import type React from "react";
import { cn } from "@/shared/utils";
import { styles } from "./table.styles";

export type TTableProps = {
	readonly headers?: readonly (string | React.ReactNode)[];
	readonly children: React.ReactNode;
	readonly className?: string;
	readonly wrapperClassName?: string;
	readonly flat?: boolean;
};

export const Table = ({
	headers,
	children,
	className,
	wrapperClassName,
	flat = false,
}: TTableProps) => {
	return (
		<div
			className={cn(
				!flat && styles.wrapper,
				flat && "w-full overflow-x-auto",
				wrapperClassName,
			)}
		>
			<table className={cn(styles.table, className)}>
				{headers && headers.length > 0 && (
					<thead className={cn(styles.thead, flat && "bg-white")}>
						<tr>
							{headers.map((header, idx) => (
								<th key={idx} scope="col" className={styles.th}>
									{header}
								</th>
							))}
						</tr>
					</thead>
				)}
				<tbody className={styles.tbody}>{children}</tbody>
			</table>
		</div>
	);
};

export const TableRow = ({
	children,
	className,
	onClick,
}: {
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
}) => (
	<tr
		className={cn(styles.tr, onClick && styles.clickable, className)}
		onClick={onClick}
	>
		{children}
	</tr>
);

export const TableCell = ({
	children,
	className,
	align = "left",
	colSpan,
	onClick,
}: {
	children: React.ReactNode;
	className?: string;
	align?: "left" | "center" | "right";
	colSpan?: number;
	onClick?: (e: React.MouseEvent<HTMLTableCellElement>) => void;
}) => (
	<td
		className={cn(styles.td, styles.align[align], className)}
		colSpan={colSpan}
		onClick={onClick}
	>
		{children}
	</td>
);
