import { createFileRoute } from "@tanstack/react-router";
import Content from "@/content/docs/pos.mdx";

export const Route = createFileRoute("/docs/pos")({
	component: DocsPOS,
});

function DocsPOS() {
	return <Content />;
}
