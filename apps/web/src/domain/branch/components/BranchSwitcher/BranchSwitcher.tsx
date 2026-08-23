import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	BuildingsLinear as BuildingIcon,
	CheckCircleLinear as CheckIcon,
	AltArrowDownLinear as ChevronDown,
} from "solar-icon-set";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/shared/utils";
import { styles } from "./BranchSwitcher.styles";

interface Branch {
	readonly id: string;
	readonly name: string;
	readonly is_active: boolean;
}

interface BranchSwitcherProps {
	readonly branches: readonly Branch[];
	readonly selectedBranchId?: string;
	readonly onBranchSelect: (branch: Branch) => void;
	readonly businessName?: string;
	readonly className?: string;
}

export function BranchSwitcher({
	branches,
	selectedBranchId,
	onBranchSelect,
	businessName,
	className,
}: BranchSwitcherProps) {
	const [open, setOpen] = useState(false);
	const { t } = useTranslation();

	const selectedBranch = branches.find((b) => b.id === selectedBranchId);
	const activeBranches = branches.filter((b) => b.is_active);

	if (activeBranches.length === 0) {
		return null;
	}

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className={cn(styles.trigger, className)}>
					<BuildingIcon className={styles.icon} />
					<div className={styles.content}>
						<div className={styles.businessLabel}>
							{businessName || t("settings.business_name")}
						</div>
						<div className={styles.branchName}>
							{selectedBranch?.name || t("boarding.select_branch")}
						</div>
					</div>
					<ChevronDown className={cn(styles.chevron, open && "rotate-180")} />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className={styles.dropdownContent}>
				{activeBranches.map((branch) => (
					<DropdownMenuItem
						key={branch.id}
						onClick={() => {
							onBranchSelect(branch);
							setOpen(false);
						}}
						className={styles.item}
					>
						<span className={styles.itemName}>{branch.name}</span>
						{branch.id === selectedBranchId && (
							<CheckIcon className={styles.itemCheck} />
						)}
					</DropdownMenuItem>
				))}
				{activeBranches.length === 0 && (
					<div className={styles.noBranch}>
						{t("branch.no_active_branches")}
					</div>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
