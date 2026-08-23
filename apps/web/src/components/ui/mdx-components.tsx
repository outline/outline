import type React from "react";

// Shared MDX components for terms and privacy pages
export const mdxComponents = {
	h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
		<h1 className="text-3xl font-bold mb-6" {...props} />
	),
	h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
		<h2 className="text-2xl font-semibold mb-4 mt-8" {...props} />
	),
	p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
		<p className="mb-4" {...props} />
	),
	ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
		<ul className="list-disc pl-6 mb-4 space-y-2" {...props} />
	),
	li: (props: React.HTMLAttributes<HTMLLIElement>) => <li {...props} />,
};
