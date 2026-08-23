import { useTranslation } from "react-i18next";
import { RefreshLinear as Refresh } from "solar-icon-set";
import { cn } from "@/shared/utils";
import { Button } from "../button/button";
import { styles } from "./error-state.styles";

export type TErrorStateProps = {
	readonly variant?: "error";
	readonly title?: string;
	readonly description?: string;
	readonly error?: Error | string;
	readonly onRetry?: () => void;
	readonly className?: string;
};

export const ErrorState = ({
	variant = "error",
	title,
	description,
	error,
	onRetry,
	className,
}: TErrorStateProps) => {
	const { t } = useTranslation();
	const illustrationSrc = variant ? `/assets/empty/${variant}.webp` : null;

	return (
		<div className={cn(styles.container, className)}>
			<div className={styles.visualWrapper}>
				{illustrationSrc ? (
					<img
						src={illustrationSrc}
						alt=""
						className={styles.illustration}
						onError={(e) => {
							(e.target as HTMLImageElement).style.display = "none";
						}}
					/>
				) : (
					<div className={styles.iconWrapper}>
						<Refresh className={styles.icon} />
					</div>
				)}
			</div>
			<div className={styles.content}>
				<h3 className={styles.title}>
					{title ?? t("error.title", "Terjadi Kesalahan")}
				</h3>
				<p className={styles.description}>
					{description ??
						t(
							"error.description",
							"Maaf, sistem gagal memuat data. Silakan coba beberapa saat lagi.",
						)}
				</p>
				{error && (
					<div className={styles.errorDetail}>
						<p className="font-bold mb-1 opacity-80 uppercase tracking-widest text-[9px]">
							{t("common.technical_details")}
						</p>
						<code>{typeof error === "string" ? error : error.message}</code>
					</div>
				)}
			</div>
			{onRetry && (
				<Button onClick={onRetry} variant="mint" className={styles.retryButton}>
					{t("common.retry", "Coba Lagi")}
				</Button>
			)}
		</div>
	);
};
