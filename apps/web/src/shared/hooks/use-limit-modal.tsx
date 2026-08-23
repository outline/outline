import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { useTranslation } from "react-i18next";
import { UpgradeModal } from "@/components/brand/UpgradeModal";

type TLimitType =
	| "branches"
	| "staff"
	| "activeBoardings"
	| "products"
	| "transactions";

interface LimitModalContextType {
	showLimitModal: (type: TLimitType) => void;
	closeLimitModal: () => void;
}

const LimitModalContext = createContext<LimitModalContextType | undefined>(
	undefined,
);

export function LimitModalProvider({ children }: { children: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);
	const [limitType, setLimitType] = useState<TLimitType | null>(null);
	const { t } = useTranslation();

	// Stable callbacks. Without useCallback, every render produces a new
	// function reference, which propagates through useLimitModal consumers
	// (e.g. useLimits) and causes downstream useCallback/useEffect deps to
	// invalidate on every render — see the /pos refetch-loop bug fixed in
	// use-limits.ts.
	const showLimitModal = useCallback((type: TLimitType) => {
		setLimitType(type);
		setIsOpen(true);
	}, []);

	const closeLimitModal = useCallback(() => {
		setIsOpen(false);
	}, []);

	const content = useMemo(() => {
		switch (limitType) {
			case "branches":
				return {
					title: t("branch.limit_reached_title"),
					description: t("branch.limit_reached_desc"),
				};
			case "staff":
				return {
					title: t("staff.limit_reached_title"),
					description: t("staff.limit_reached_desc"),
				};
			case "activeBoardings":
				return {
					title: t("boarding.limit_reached_title"),
					description: t("boarding.limit_reached_desc"),
				};
			case "products":
				return {
					title: t("product_page.limit_reached_title"),
					description: t("product.limit_reached"),
				};
			case "transactions":
				return {
					title: t("pos.limit_reached_title"),
					description: t("pos.limit_reached_desc"),
				};
			default:
				return {
					title: t("common.limit_reached", "Batas Tercapai"),
					description: t(
						"common.limit_reached_desc",
						"Anda telah mencapai batas paket Anda.",
					),
				};
		}
	}, [limitType, t]);

	const value = useMemo(
		() => ({ showLimitModal, closeLimitModal }),
		[showLimitModal, closeLimitModal],
	);

	return (
		<LimitModalContext.Provider value={value}>
			{children}
			<UpgradeModal
				isOpen={isOpen}
				onClose={closeLimitModal}
				title={content.title}
				description={content.description}
			/>
		</LimitModalContext.Provider>
	);
}

export function useLimitModal() {
	const context = useContext(LimitModalContext);
	if (context === undefined) {
		throw new Error("useLimitModal must be used within a LimitModalProvider");
	}
	return context;
}
