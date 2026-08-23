import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from "@tanstack/react-start";
import { renderErrorPage } from "@/shared/utils";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
	try {
		return await next();
	} catch (error) {
		if (error != null && typeof error === "object" && "statusCode" in error) {
			throw error;
		}
		console.error(error);
		return new Response(renderErrorPage(error), {
			status: 500,
			headers: { "content-type": "text/html; charset=utf-8" },
		});
	}
});

const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
	requestMiddleware: [csrfMiddleware, errorMiddleware],
}));
