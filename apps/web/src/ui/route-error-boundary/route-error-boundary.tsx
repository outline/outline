import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RefreshLinear as Refresh } from "solar-icon-set";
import { Button } from "@/components/ui/button";
import { cn } from "@/shared/utils";

export type TRouteErrorBoundaryProps = {
	readonly error: Error;
	readonly reset: () => void;
	readonly className?: string;
};

export const RouteErrorBoundary = ({
	error,
	reset,
	className,
}: TRouteErrorBoundaryProps) => {
	const { t } = useTranslation();

	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center min-h-[400px] p-8 text-center",
				className,
			)}
		>
			<div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
				<Refresh className="w-8 h-8 text-red-500" />
			</div>
			<h3 className="text-lg font-bold text-neutral-900 mb-2">
				{t("error.route_error_title", "Halaman Gagal Dimuat")}
			</h3>
			<p className="text-sm text-neutral-500 mb-6 max-w-md">
				{t(
					"error.route_error_desc",
					"Terjadi kesalahan tak terduga saat memuat halaman ini. Silakan coba lagi atau kembali ke beranda.",
				)}
			</p>
			{error && (
				<div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6 max-w-lg w-full">
					<p className="font-bold text-[10px] uppercase tracking-widest text-neutral-400 mb-2">
						{t("common.technical_details")}
					</p>
					<code className="text-xs text-red-600 break-all">
						{error.message}
					</code>
				</div>
			)}
			<div className="flex items-center gap-3">
				<Button variant="outline" onClick={reset}>
					<Refresh className="w-4 h-4 mr-2" />
					{t("common.retry", "Coba Lagi")}
				</Button>
				<Button asChild>
					<Link to="/">{t("error_page.back_home", "Kembali ke Beranda")}</Link>
				</Button>
			</div>
		</div>
	);
};
