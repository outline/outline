import { createFileRoute } from "@tanstack/react-router";
import Content from "@/content/docs/boarding.mdx";

export const Route = createFileRoute("/docs/boarding")({
	component: BoardingDocs,
});

function BoardingDocs() {
	return <Content />;
}
