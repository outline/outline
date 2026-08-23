import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	ChartLinear as ChartIcon,
	ClockCircleLinear as ClockIcon,
	Dialog2Linear as MessageIcon,
	SettingsLinear as SettingsIcon,
} from "solar-icon-set";
import {
	AnimatedTabs,
	AnimatedTabsContent,
	AnimatedTabsList,
	AnimatedTabsTrigger,
} from "@/components/ui/tabs";
import {
	WhatsAppOverview,
	WhatsAppSettings,
	WhatsAppTemplates,
} from "@/domain/whatsapp";
import { whatsappApi } from "@/lib/api/whatsapp.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { i18n } from "@/shared/i18n/i18n.config";
import { EmptyState, PageHeader } from "@/ui";

export const Route = createFileRoute("/_authenticated/whatsapp")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("whatsapp_page.title")} — Petso` },
			{
				name: "description",
				content: i18n.t("whatsapp_page.description"),
			},
		],
	}),
	component: WhatsAppPage,
});

function WhatsAppPage() {
	const { t } = useTranslation();

	const { data: stats } = useQuery({
		queryKey: queryKeys.whatsapp.stats(),
		queryFn: () => whatsappApi.getWhatsAppStats(),
		staleTime: QUERY_POLICY.reference.staleTime,
		gcTime: QUERY_POLICY.reference.gcTime,
	});

	const { data: config } = useQuery({
		queryKey: queryKeys.whatsapp.config(),
		queryFn: () => whatsappApi.getWhatsAppConfig(),
		staleTime: QUERY_POLICY.reference.staleTime,
		gcTime: QUERY_POLICY.reference.gcTime,
	});

	return (
		<div className="flex flex-col flex-1 animate-in fade-in duration-500 h-full w-full">
			<PageHeader
				title={t("whatsapp_page.heading")}
				description={t("whatsapp_page.subheading")}
				docHref="/docs/whatsapp"
			/>

			<div className="p-6 lg:p-8 flex-1 bg-white">
				<div className="max-w-6xl mx-auto space-y-8">
					<AnimatedTabs defaultValue="overview" indicator="pill">
						<AnimatedTabsList>
							<AnimatedTabsTrigger value="overview">
								<ChartIcon className="w-4 h-4" />
								{t("common.overview")}
							</AnimatedTabsTrigger>
							<AnimatedTabsTrigger value="templates">
								<MessageIcon className="w-4 h-4" />
								{t("whatsapp.template_tab")}
							</AnimatedTabsTrigger>
							<AnimatedTabsTrigger value="scheduled">
								<ClockIcon className="w-4 h-4" />
								{t("whatsapp.scheduled_tab")}
							</AnimatedTabsTrigger>
							<AnimatedTabsTrigger value="settings">
								<SettingsIcon className="w-4 h-4" />
								{t("whatsapp.settings_tab")}
							</AnimatedTabsTrigger>
						</AnimatedTabsList>

						<AnimatedTabsContent value="overview">
							<WhatsAppOverview stats={stats || null} />
						</AnimatedTabsContent>
						<AnimatedTabsContent value="templates">
							<WhatsAppTemplates onAddClick={() => {}} />
						</AnimatedTabsContent>
						<AnimatedTabsContent value="scheduled">
							<EmptyState
								variant="whatsapp"
								title={t("whatsapp.scheduled_tab")}
								description={t("whatsapp.maintenance_msg")}
								className="bg-white border-neutral-100 "
							/>
						</AnimatedTabsContent>
						<AnimatedTabsContent value="settings">
							<WhatsAppSettings config={config || null} />
						</AnimatedTabsContent>
					</AnimatedTabs>
				</div>
			</div>
		</div>
	);
}
