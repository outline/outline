import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/shared/utils";

interface CommissionRecord {
	id: string;
	createdAt: string;
	referenceType: string;
	status: string;
	amount: number;
}

interface CommissionHistoryProps {
	records?: CommissionRecord[];
	isLoading?: boolean;
	totalPending: number;
	onPay: () => void;
	isPaying?: boolean;
}

export function CommissionHistory({
	records,
	isLoading,
	totalPending,
	onPay,
	isPaying,
}: CommissionHistoryProps) {
	const { t } = useTranslation();

	return (
		<div className="p-6 border border-neutral-200/60 rounded-xl bg-white">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h3 className="text-lg font-bold text-neutral-900">
						{t("commission.history_title")}
					</h3>
					<p className="text-sm text-neutral-500">
						{t("commission.history_subtitle")}
					</p>
				</div>
				<div className="flex items-center gap-4">
					<div className="text-right">
						<div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
							{t("commission.total_pending")}
						</div>
						<div className="text-lg font-bold text-blue-600">
							{formatCurrency(totalPending)}
						</div>
					</div>
					<Button onClick={onPay} disabled={totalPending === 0 || isPaying}>
						{isPaying ? t("common.processing") : t("commission.pay_all")}
					</Button>
				</div>
			</div>

			<div className="bg-white rounded-lg border border-neutral-200/60 overflow-hidden">
				<div className="grid grid-cols-4 gap-4 px-6 py-3 bg-neutral-50 border-b border-neutral-200/60 text-xs font-bold text-neutral-400 uppercase tracking-widest">
					<div>{t("common.date")}</div>
					<div>{t("commission.reference")}</div>
					<div>{t("common.status")}</div>
					<div className="text-right">{t("common.amount")}</div>
				</div>
				<div className="divide-y divide-neutral-100 max-h-[300px] overflow-y-auto">
					{isLoading ? (
						[1, 2, 3].map((i) => (
							<div
								key={i}
								className="grid grid-cols-4 gap-4 px-6 py-4 items-center"
							>
								<Skeleton className="h-4 w-20 rounded-lg" />
								<Skeleton className="h-4 w-24 rounded-lg" />
								<Skeleton className="h-5 w-16 rounded-full" />
								<Skeleton className="h-4 w-20 rounded-lg ml-auto" />
							</div>
						))
					) : records?.length === 0 ? (
						<div className="p-8 text-center text-sm text-neutral-400">
							{t("commission.no_history")}
						</div>
					) : (
						records?.map((record) => (
							<div
								key={record.id}
								className="grid grid-cols-4 gap-4 px-6 py-4 items-center text-sm"
							>
								<div className="text-neutral-900 font-medium">
									{new Date(record.createdAt).toLocaleDateString("id-ID")}
								</div>
								<div className="text-neutral-500 capitalize">
									{record.referenceType}
								</div>
								<div>
									<span
										className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
											record.status === "paid"
												? "bg-emerald-100 text-emerald-700"
												: "bg-amber-100 text-amber-700"
										}`}
									>
										{record.status}
									</span>
								</div>
								<div className="text-right font-bold text-neutral-900">
									{formatCurrency(record.amount)}
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
