import { Link } from "@tanstack/react-router";
import {
	ChartSquareLinear as ChartIcon,
	ShopLinear as ShopIcon,
	StarFallBoldDuotone as StarIcon,
	UsersGroupRoundedLinear as TeamIcon,
	WalletLinear as WalletIcon,
} from "solar-icon-set";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";

interface UpgradeModalProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	description: string;
}

const UPGRADE_FEATURES = [
	{
		title: "Manajemen Cabang",
		desc: "Kelola banyak cabang toko secara terpusat.",
		icon: ShopIcon,
		iconColor: "text-orange-500",
		bgColor: "bg-orange-50",
	},
	{
		title: "Laporan Keuangan",
		desc: "Analitik mendalam untuk memantau performa.",
		icon: ChartIcon,
		iconColor: "text-blue-500",
		bgColor: "bg-blue-50",
	},
	{
		title: "Kolaborasi Tim",
		desc: "Akses fitur untuk banyak staf dengan kontrol.",
		icon: TeamIcon,
		iconColor: "text-purple-500",
		bgColor: "bg-purple-50",
	},
	{
		title: "Tanpa Batas",
		desc: "Pemrosesan transaksi kasir tanpa kuota harian.",
		icon: WalletIcon,
		iconColor: "text-emerald-500",
		bgColor: "bg-emerald-50",
	},
];

export function UpgradeModal({
	isOpen,
	onClose,
	title,
	description,
}: UpgradeModalProps) {
	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[460px] p-0 border-none shadow-xl gap-0 overflow-hidden">
				{/* Hidden Title for screen readers */}
				<DialogTitle className="sr-only">{title}</DialogTitle>
				<DialogDescription className="sr-only">{description}</DialogDescription>

				<div className="flex flex-col">
					{/* Header section with soft gradient */}
					<div
						className="px-8 pt-12 pb-8 flex flex-col items-center text-center"
						style={{
							background:
								"radial-gradient(ellipse 140% 100% at 50% 0%, #FFE9C2 0%, #FFF5E1 35%, #FFFFFF 100%)",
						}}
					>
						<div className="w-14 h-14 mb-5 text-[#F59E0B] drop-shadow-sm">
							<StarIcon className="w-full h-full" />
						</div>
						<h2 className="text-[22px] font-bold text-[#8A6A24] tracking-tight leading-snug">
							{title}
						</h2>
						{description && (
							<p className="text-[14px] text-neutral-600 mt-2.5 max-w-[320px] leading-relaxed font-medium">
								{description}
							</p>
						)}
					</div>

					{/* Body section (Vertical List) */}
					<div className="px-8 pb-8 flex flex-col">
						<div className="flex flex-col gap-6 mt-2 mb-8">
							{UPGRADE_FEATURES.map((feat) => {
								const Icon = feat.icon;
								return (
									<div key={feat.title} className="flex items-start gap-4">
										<div
											className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${feat.bgColor}`}
										>
											<Icon className={`w-5 h-5 ${feat.iconColor}`} />
										</div>
										<div className="flex flex-col gap-0.5 pt-0.5">
											<h3 className="text-[14px] font-bold text-neutral-900">
												{feat.title}
											</h3>
											<p className="text-[13px] text-neutral-500 leading-relaxed font-medium">
												{feat.desc}
											</p>
										</div>
									</div>
								);
							})}
						</div>

						{/* Footer section */}
						<div className="flex flex-col items-stretch gap-3 mt-auto">
							<Link
								to="/settings/billing"
								onClick={onClose}
								className="flex items-center justify-center px-6 py-3 rounded-lg bg-[#138E55] text-white font-bold text-[14px] hover:bg-[#107A48] transition-colors shadow-sm"
							>
								Lihat Paket Pro
							</Link>
							<button
								type="button"
								onClick={onClose}
								className="flex items-center justify-center px-6 py-3 rounded-lg border border-neutral-200 text-neutral-600 font-semibold text-[14px] hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
							>
								Nanti Saja
							</button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
