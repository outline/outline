import type { AnimationGeneratorType, Variants } from "motion";

export type TabIndicatorVariant = "underline" | "pill" | "slide";
export type TabContentVariant = "fade" | "slide" | "slideUp";

export const indicatorVariants: Record<
	TabIndicatorVariant,
	{
		transition: {
			type?: AnimationGeneratorType;
			stiffness?: number;
			damping?: number;
			duration?: number;
		};
	}
> = {
	underline: {
		transition: {
			type: "spring",
			stiffness: 300,
			damping: 30,
		},
	},
	pill: {
		transition: {
			type: "spring",
			stiffness: 300,
			damping: 30,
		},
	},
	slide: {
		transition: {
			type: "spring",
			stiffness: 400,
			damping: 35,
		},
	},
};

export const contentVariants: Record<TabContentVariant, Variants> = {
	fade: {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: {
				duration: 0.2,
				ease: "easeOut",
			},
		},
		exit: {
			opacity: 0,
			transition: {
				duration: 0.15,
				ease: "easeIn",
			},
		},
	},
	slide: {
		hidden: { opacity: 0, x: 12 },
		visible: {
			opacity: 1,
			x: 0,
			transition: {
				duration: 0.25,
				ease: [0.4, 0, 0.2, 1],
			},
		},
		exit: {
			opacity: 0,
			x: -12,
			transition: {
				duration: 0.2,
			},
		},
	},
	slideUp: {
		hidden: { opacity: 0, y: 8 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.25,
				ease: [0.4, 0, 0.2, 1],
			},
		},
		exit: {
			opacity: 0,
			y: -4,
			transition: {
				duration: 0.2,
			},
		},
	},
};
