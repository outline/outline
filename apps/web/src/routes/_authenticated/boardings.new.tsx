import { createFileRoute } from "@tanstack/react-router";
import { BoardingForm } from "@/domain/boarding";
import { APP_CONFIG } from "@/lib/constants";

import { i18n } from "@/shared/i18n/i18n.config";

export const Route = createFileRoute("/_authenticated/boardings/new")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("boarding.new_meta_title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("boarding.new_meta_desc"),
			},
		],
	}),
	component: BoardingForm,
});
