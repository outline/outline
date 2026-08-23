import { createFileRoute } from "@tanstack/react-router";
import Content from "@/content/docs/dashboard.mdx";

export const Route = createFileRoute("/docs/dashboard")({
	component: DashboardDocs,
});

function DashboardDocs() {
	return <Content />;
}
