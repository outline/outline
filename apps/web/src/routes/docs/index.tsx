import { createFileRoute } from "@tanstack/react-router";
import Content from "@/content/docs/introduction.mdx";

export const Route = createFileRoute("/docs/")({
	component: DocsIntroduction,
});

function DocsIntroduction() {
	return <Content />;
}
