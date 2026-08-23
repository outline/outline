import { cn } from "@/lib/utils";

const MESCHAC_AVATAR = "https://avatars.githubusercontent.com/u/47919550?v=4";
const BERNARD_AVATAR = "https://avatars.githubusercontent.com/u/31113941?v=4";
const THEO_AVATAR = "https://avatars.githubusercontent.com/u/68236786?v=4";
const GLODIE_AVATAR = "https://avatars.githubusercontent.com/u/99137927?v=4";

export const Table = ({ className }: { className?: string }) => {
	const customers = [
		{
			id: 1,
			date: "10/31/2023",
			status: "Paid",
			statusVariant: "success" as const,
			name: "Bernard Ng",
			avatar: BERNARD_AVATAR,
			revenue: "$43.99",
		},
		{
			id: 2,
			date: "10/21/2023",
			status: "Ref",
			statusVariant: "warning" as const,
			name: "Méschac Irung",
			avatar: MESCHAC_AVATAR,
			revenue: "$19.99",
		},
		{
			id: 3,
			date: "10/15/2023",
			status: "Paid",
			statusVariant: "success" as const,
			name: "Glodie Ng",
			avatar: GLODIE_AVATAR,
			revenue: "$99.99",
		},
		{
			id: 4,
			date: "10/12/2023",
			status: "Cancelled",
			statusVariant: "danger" as const,
			name: "Theo Ng",
			avatar: THEO_AVATAR,
			revenue: "$19.99",
		},
	];

	return (
		<div
			className={cn(
				"bg-background shadow-foreground/5 inset-ring-1 inset-ring-background ring-foreground/5 relative w-full overflow-hidden rounded-xl border border-transparent p-6 shadow-md ring-1",
				className,
			)}
		>
			<div className="mb-6">
				<div className="flex gap-1.5">
					<div className="bg-muted size-2 rounded-full border border-black/5" />
					<div className="bg-muted size-2 rounded-full border border-black/5" />
					<div className="bg-muted size-2 rounded-full border border-black/5" />
				</div>
				<div className="mt-3 text-lg font-medium">Customers</div>
				<p className="mt-1 text-sm">
					New users by First user primary channel group (Default Channel Group)
				</p>
			</div>
			<table className="w-max table-auto border-collapse lg:w-full">
				<thead className="bg-foreground/5">
					<tr className="*:border *:p-3 *:text-left *:text-sm *:font-medium">
						<th className="rounded-l-[--card-radius]">#</th>
						<th>Date</th>
						<th>Status</th>
						<th>Customer</th>
						<th className="rounded-r-[--card-radius]">Revenue</th>
					</tr>
				</thead>
				<tbody className="text-sm">
					{customers.map((customer) => (
						<tr key={customer.id} className="*:border *:p-2">
							<td>{customer.id}</td>
							<td>{customer.date}</td>
							<td>
								<span
									className={cn(
										"rounded-full px-2 py-1 text-xs",
										customer.statusVariant === "success" &&
											"bg-lime-500/15 text-lime-800",
										customer.statusVariant === "danger" &&
											"bg-red-500/15 text-red-800",
										customer.statusVariant === "warning" &&
											"bg-yellow-500/15 text-yellow-800",
									)}
								>
									{customer.status}
								</span>
							</td>
							<td>
								<div className="flex items-center gap-2">
									<div className="size-6 overflow-hidden rounded-full">
										<img
											src={customer.avatar}
											alt={customer.name}
											loading="lazy"
										/>
									</div>
									<span className="text-foreground">{customer.name}</span>
								</div>
							</td>
							<td>{customer.revenue}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};
