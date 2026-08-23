import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	BuildingsLinear as Building2,
	CalendarLinear as CalendarIcon,
	CheckCircleLinear as Check,
	MapPointLinear as MapPin,
	MinusCircleLinear as Minus,
	PenNewSquareLinear as Pencil,
	PhoneLinear as Phone,
	BedLinear as RoomIcon,
	TrashBinMinimalisticLinear as Trash2,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import type { TBranch } from "@/domain/branch";
import { cn } from "@/shared/utils";
import { Button, Card, StatusBadge } from "@/ui";
import { SafeHtml } from "@/shared/components/SafeHtml";
import { styles } from "./BranchCard.styles";

export type TBranchCardProps = {
	readonly branch: TBranch;
	readonly onEdit: (branch: TBranch) => void;
	readonly onDelete: (branch: TBranch) => void;
	readonly onToggleStatus: (branch: TBranch) => void;
	readonly onManageHolidays?: (branch: TBranch) => void;
};

export const BranchCard = ({
	branch,
	onEdit,
	onDelete,
	onToggleStatus,
	onManageHolidays,
}: TBranchCardProps) => {
	const { t } = useTranslation();
	const handleCopyId = () => {
		navigator.clipboard.writeText(branch.id);
		toast.success(t("toast.branch.copy_id_success_title"), {
			description: t("toast.branch.copy_id_success_desc"),
		});
	};

	return (
		<Card className={`${styles.card} ${!branch.isActive && "opacity-60"}`}>
			<div className={styles.header}>
				<div className={styles.info}>
					<div className={styles.iconContainer}>
						<Building2 className={styles.icon} />
					</div>
					<div>
						<h3 className={styles.name}>{branch.name}</h3>
						<StatusBadge
							type={branch.isActive ? "success" : "neutral"}
							label={
								branch.isActive ? t("common.active") : t("common.inactive")
							}
						/>
					</div>
				</div>

				<div className={styles.actions}>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onEdit(branch)}
						className="h-8 w-8 p-0"
					>
						<Pencil className="w-4 h-4" />
					</Button>
					{onManageHolidays && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => onManageHolidays(branch)}
							className="h-8 w-8 p-0"
							title={t("branch.manage_holidays", "Kelola Libur")}
						>
							<CalendarIcon className="w-4 h-4" />
						</Button>
					)}
					<Link
						to="/branches/$branchId/rooms"
						params={{ branchId: branch.id }}
						className="h-8 w-8 p-0 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-neutral-200 bg-white hover:bg-neutral-100 hover:text-neutral-900"
						title={t("branch.manage_rooms", "Kelola Kamar")}
					>
						<RoomIcon className="w-4 h-4" />
					</Link>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onToggleStatus(branch)}
						className="h-8 w-8 p-0"
					>
						{branch.isActive ? (
							<Minus className="w-4 h-4" />
						) : (
							<Check className="w-4 h-4" />
						)}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => onDelete(branch)}
						className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-transparent"
					>
						<Trash2 className="w-4 h-4" />
					</Button>
				</div>
			</div>

			<div className={styles.details}>
				<div className={styles.detailItem}>
					<MapPin className={styles.detailIconSvg} />
					{branch.address ? (
						<SafeHtml
							html={branch.address}
							className={cn(
								styles.addressText,
								"[&>p]:m-0 [&>p]:leading-normal",
							)}
						/>
					) : (
						<span className={styles.addressText}>Alamat belum diatur</span>
					)}
				</div>
				<div className={styles.detailItem}>
					<Phone className={styles.detailIconSvg} />
					<span className={styles.phoneText}>
						{branch.phone || "No. telp belum diatur"}
					</span>
				</div>
			</div>

			<div className={styles.footer}>
				<span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
					Branch ID
				</span>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className={styles.branchId}
					onClick={handleCopyId}
				>
					{branch.id.substring(0, 8)}...
				</Button>
			</div>
		</Card>
	);
};
