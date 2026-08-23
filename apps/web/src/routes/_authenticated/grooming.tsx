import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/grooming")({
	component: GroomingLayout,
});

function GroomingLayout() {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={t("grooming.title")}
				description={t("grooming.subtitle")}
			/>
			<div className="p-6 lg:p-8 flex-1 bg-white">
				<Outlet />
			</div>
		</div>
	);
}
