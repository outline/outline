import { createFileRoute } from "@tanstack/react-router";
import Content from "@/content/docs/branches.mdx";

export const Route = createFileRoute("/docs/branches")({
	component: BranchesDocs,
});

function BranchesDocs() {
	return <Content />;
}
