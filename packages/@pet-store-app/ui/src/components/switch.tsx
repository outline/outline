import * as SwitchPrimitives from "@radix-ui/react-switch";
import * as React from "react";

import { cn } from "../utils";

const Switch = React.forwardRef<
	React.ElementRef<typeof SwitchPrimitives.Root>,
	React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitives.Root
		className={cn(
			"cursor-pointer rounded-full bg-tertiary ring-[0.5px] ring-secondary outline-focus-ring transition duration-150 ease-linear ring-inset",
			"h-6 w-11 p-0.5",
			"data-[state=checked]:bg-brand-solid",
			"data-[state=checked]:hover:bg-brand-solid_hover",
			"disabled:cursor-not-allowed disabled:opacity-50",
			"focus-visible:outline-2 focus-visible:outline-offset-2",
			className,
		)}
		{...props}
		ref={ref}
	>
		<SwitchPrimitives.Thumb
			className={cn(
				"block rounded-full bg-white shadow-sm ring-0",
				"size-5",
				"transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
			)}
		/>
	</SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
