import { createFileRoute } from "@tanstack/react-router";
import { BoardingDetail } from "@/domain/boarding";
import { APP_CONFIG } from "@/lib/constants";

import { i18n } from "@/shared/i18n/i18n.config";

export const Route = createFileRoute("/_authenticated/boardings/$id")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("boarding.detail_meta_title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("boarding.detail_meta_desc"),
			},
		],
	}),
	component: BoardingDetailWrapper,
});

function BoardingDetailWrapper() {
	const { id } = Route.useParams();
	return <BoardingDetail id={id} />;
}
