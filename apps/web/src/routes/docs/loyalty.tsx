import { createFileRoute } from "@tanstack/react-router";
import Content from "@/content/docs/loyalty.mdx";

export const Route = createFileRoute("/docs/loyalty")({
	component: DocsLoyalty,
});

function DocsLoyalty() {
	return <Content />;
}
