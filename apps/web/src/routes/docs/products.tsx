import { createFileRoute } from "@tanstack/react-router";
import Content from "@/content/docs/products.mdx";

export const Route = createFileRoute("/docs/products")({
	component: DocsProducts,
});

function DocsProducts() {
	return <Content />;
}
