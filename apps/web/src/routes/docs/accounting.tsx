import { createFileRoute } from "@tanstack/react-router";
import Content from "@/content/docs/accounting.mdx";

export const Route = createFileRoute("/docs/accounting")({
	component: DocsAccounting,
});

function DocsAccounting() {
	return <Content />;
}
