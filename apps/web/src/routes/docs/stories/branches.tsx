import { createFileRoute } from "@tanstack/react-router";
import Content from "@/content/docs/stories-branches.mdx";

export const Route = createFileRoute("/docs/stories/branches")({
	component: () => <Content />,
});
