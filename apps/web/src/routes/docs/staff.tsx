import { createFileRoute } from "@tanstack/react-router";
import Content from "@/content/docs/staff.mdx";

export const Route = createFileRoute("/docs/staff")({
	component: DocsStaff,
});

function DocsStaff() {
	return <Content />;
}
