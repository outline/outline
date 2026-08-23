import { createFileRoute } from "@tanstack/react-router";
import Content from "@/content/docs/stories-boarding.mdx";

export const Route = createFileRoute("/docs/stories/boarding")({
	component: () => <Content />,
});
