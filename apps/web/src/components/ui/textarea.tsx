import * as React from "react";

import { cn } from "@/shared/utils";

const Textarea = React.forwardRef<
	HTMLTextAreaElement,
	React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
	return (
		<textarea
			className={cn(
				"w-full scroll-py-3 rounded-lg bg-transparent  border border-input transition duration-100 ease-linear placeholder:text-muted-foreground autofill:rounded-lg focus:outline-hidden",
				"px-3.5 py-3 text-md",
				"focus:ring-1 focus:ring-ring",
				"disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			ref={ref}
			{...props}
		/>
	);
});
Textarea.displayName = "Textarea";

export { Textarea };
