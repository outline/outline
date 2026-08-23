import { createFileRoute } from "@tanstack/react-router";
import Content from "@/content/docs/auth.mdx";

export const Route = createFileRoute("/docs/auth")({
	component: AuthDocs,
});

function AuthDocs() {
	return <Content />;
}
