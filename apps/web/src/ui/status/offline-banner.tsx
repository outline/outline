import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	CloseCircleLinear as CloseIcon,
	LinkBrokenLinear as WifiOff,
	WiFiRouterLinear as WifiUnstable,
} from "solar-icon-set";
import { useNetwork } from "@/shared/hooks/use-network";

export function OfflineBanner() {
	const { t } = useTranslation();
	const { isOnline, isUnstable } = useNetwork();
	const [isDismissed, setIsDismissed] = useState(false);

	if ((isOnline && !isUnstable) || isDismissed) return null;

	return (
		<div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 sm:left-auto sm:right-4 sm:w-auto">
			<div
				className={`flex items-start gap-3 rounded-xl border p-4 pr-10 shadow-lg backdrop-blur-sm relative ${
					!isOnline
						? "border-rose-100 bg-white/95"
						: "border-amber-100 bg-white/95"
				}`}
			>
				<button
					onClick={() => setIsDismissed(true)}
					className="absolute top-2 right-2 p-1 rounded-md text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
					aria-label="Tutup"
				>
					<CloseIcon className="w-5 h-5" />
				</button>
				<div
					className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
						!isOnline
							? "bg-rose-50 text-rose-500"
							: "bg-amber-50 text-amber-500"
					}`}
				>
					{!isOnline ? (
						<WifiOff className="h-5 w-5" />
					) : (
						<WifiUnstable className="h-5 w-5 animate-pulse" />
					)}
				</div>
				<div>
					<p className="text-[13px] font-bold text-neutral-900">
						{!isOnline ? t("common.offline_title") : t("common.unstable_title")}
					</p>
					<p className="text-[11px] font-medium text-neutral-500">
						{!isOnline ? t("common.offline_desc") : t("common.unstable_desc")}
					</p>
				</div>
			</div>
		</div>
	);
}
