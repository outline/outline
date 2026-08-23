import { createRouter } from "@tanstack/react-router";
import { createAppQueryClient } from "@/shared/cache/query-client";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
	const queryClient = createAppQueryClient();

	const router = createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
	});

	return router;
};
