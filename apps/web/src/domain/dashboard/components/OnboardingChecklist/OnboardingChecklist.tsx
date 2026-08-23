import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircleLinear as CheckIcon } from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";
import { styles } from "./OnboardingChecklist.styles";

export type TOnboardingChecklistProps = {
	readonly checks: readonly {
		readonly id: string;
		readonly label: string;
		readonly done: boolean;
		readonly link: string;
	}[];
};

const STORAGE_KEY = "onboarding_checklist_dismissed";

export const OnboardingChecklist = ({ checks }: TOnboardingChecklistProps) => {
	const { t } = useTranslation();
	const [dismissed, setDismissed] = useState(() => {
		if (typeof window === "undefined") return false;
		return localStorage.getItem(STORAGE_KEY) === "true";
	});

	const completedCount = checks.filter((c) => c.done).length;
	const allDone = completedCount === checks.length;

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, String(dismissed));
	}, [dismissed]);

	if (dismissed || allDone) return null;

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div>
					<h3 className={styles.title}>{t("dashboard.onboarding_title")}</h3>
					<p className={styles.subtitle}>
						{completedCount}/{checks.length} {t("dashboard.onboarding_steps")}
					</p>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={() => setDismissed(true)}
					className={styles.dismissButton}
				>
					{t("dashboard.hide_checklist")}
				</Button>
			</div>

			<div className={styles.grid}>
				{checks.map((check, i) => (
					<Link
						key={check.id}
						to={check.link as string}
						className={cn(
							styles.link,
							check.done ? styles.linkDone : styles.linkPending,
						)}
					>
						<div
							className={cn(
								styles.iconContainer,
								check.done ? styles.iconDone : styles.iconPending,
							)}
						>
							{check.done ? (
								<CheckIcon className="w-3.5 h-3.5" />
							) : (
								<span className={styles.iconNumber}>{i + 1}</span>
							)}
						</div>
						<span
							className={cn(
								styles.label,
								check.done ? styles.labelDone : styles.labelPending,
							)}
						>
							{t(check.label)}
						</span>
					</Link>
				))}
			</div>

			<div className={styles.progressContainer}>
				<div
					className={styles.progressBar}
					style={{ width: `${(completedCount / checks.length) * 100}%` }}
				/>
			</div>
		</div>
	);
};
