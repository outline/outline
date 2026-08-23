"use client";

import * as React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { AnimatePresence, motion } from "motion/react";
import {
	contentVariants,
	indicatorVariants,
	type TabContentVariant,
	type TabIndicatorVariant,
} from "@/components/ui/tab-variants";
import { cn } from "@/shared/utils";

interface IndicatorLayout {
	left: number;
	width: number;
}

interface AnimatedTabsContextValue {
	indicatorVariant: TabIndicatorVariant;
	contentVariant: TabContentVariant;
	value: string;
	listRef: React.RefObject<HTMLDivElement | null>;
	indicatorLayout: IndicatorLayout | null;
	registerTrigger: (value: string, el: HTMLButtonElement | null) => void;
}

export interface AnimatedTabsProps
	extends React.ComponentProps<typeof TabsPrimitive.Root> {
	/** @public Indicator animation: underline, pill or slide */
	indicator?: TabIndicatorVariant;
	/** @public Content animation: fade, slide or slideUp */
	contentAnimation?: TabContentVariant;
}

const AnimatedTabsContext = createContext<AnimatedTabsContextValue | null>(null);

const useAnimatedTabs = () => {
	const ctx = useContext(AnimatedTabsContext);
	if (!ctx)
		throw new Error(
			"useAnimatedTabs must be used within a AnimatedTabsProvider",
		);
	return ctx;
};

const AnimatedTabs: React.FC<AnimatedTabsProps> = ({
	indicator = "underline",
	contentAnimation = "fade",
	className,
	onValueChange,
	...props
}) => {
	const [indicatorLayout, setIndicatorLayout] =
		useState<IndicatorLayout | null>(null);
	const [activeTab, setActiveTab] = useState<string>(
		() => props.value ?? props.defaultValue ?? "",
	);
	const listRef = useRef<HTMLDivElement | null>(null);
	const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

	useEffect(() => {
		if (props.value !== undefined) setActiveTab(props.value);
	}, [props.value]);

	const handleValueChange = useCallback(
		(next: string) => {
			setActiveTab(next);
			onValueChange?.(next);
		},
		[onValueChange],
	);

	const registerTrigger = useCallback(
		(value: string, el: HTMLButtonElement | null) => {
			if (el) triggerRefs.current.set(value, el);
			else triggerRefs.current.delete(value);
		},
		[],
	);

	const updateIndicator = useCallback(() => {
		const list = listRef?.current;
		const current = activeTab;
		const trigger = current ? triggerRefs.current.get(current) : undefined;

		if (!list || !trigger) {
			setIndicatorLayout(null);
			return;
		}

		const listRect = list.getBoundingClientRect();
		const triggerRect = trigger.getBoundingClientRect();
		setIndicatorLayout({
			left: triggerRect.left - listRect.left,
			width: triggerRect.width,
		});
	}, [activeTab]);

	React.useLayoutEffect(() => {
		updateIndicator();
		const list = listRef.current;
		if (!list) return;
		const ro = new ResizeObserver(updateIndicator);
		ro.observe(list);
		return () => ro.disconnect();
	}, [updateIndicator]);

	return (
		<AnimatedTabsContext.Provider
			value={{
				indicatorVariant: indicator,
				contentVariant: contentAnimation,
				value: activeTab,
				listRef,
				indicatorLayout,
				registerTrigger,
			}}
		>
			<TabsPrimitive.Root
				data-slot="animated-tabs"
				className={cn("flex flex-col gap-2", className)}
				{...props}
				onValueChange={handleValueChange}
			/>
		</AnimatedTabsContext.Provider>
	);
};

const AnimatedTabsList = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
	const { listRef, indicatorLayout, indicatorVariant, registerTrigger } =
		useAnimatedTabs();
	const transition = indicatorVariants[indicatorVariant].transition;

	const setRef = useCallback(
		(node: HTMLDivElement | null) => {
			listRef.current = node;
			if (typeof ref === "function") ref(node);
			else if (ref) ref.current = node;
		},
		[listRef, ref],
	);

	return (
		<TabsPrimitive.List
			ref={setRef}
			data-slot="animated-tabs-list"
			className={cn(
				"relative inline-flex h-10 w-fit items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
				className,
			)}
			{...props}
		>
			{children}
			{indicatorLayout && (
				<motion.div
					className={cn(
						"absolute rounded-md",
						indicatorVariant === "underline" &&
							"bottom-0 left-0 h-0.5 bg-brand-solid",
						(indicatorVariant === "pill" ||
							indicatorVariant === "slide") &&
							"top-1 bottom-1 bg-white  dark:bg-neutral-800",
					)}
					style={{
						left: indicatorLayout.left,
						width: indicatorLayout.width,
					}}
					layout
					transition={transition}
					aria-hidden
				/>
			)}
		</TabsPrimitive.List>
	);
});
AnimatedTabsList.displayName = "AnimatedTabsList";

const AnimatedTabsTrigger = React.forwardRef<
	HTMLButtonElement,
	React.ComponentProps<typeof TabsPrimitive.Trigger>
>(({ className, value, ...props }, ref) => {
	const { registerTrigger } = useAnimatedTabs();
	const triggerValue = value ?? "";

	const setRef = useCallback(
		(node: HTMLButtonElement | null) => {
			registerTrigger(triggerValue, node);
			if (typeof ref === "function") ref(node);
			else if (ref) ref.current = node;
		},
		[registerTrigger, triggerValue, ref],
	);

	return (
		<TabsPrimitive.Trigger
			ref={setRef}
			data-slot="animated-tabs-trigger"
			value={value}
			className={cn(
				"relative z-[1] inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-medium text-muted-foreground text-sm outline-none transition-colors",
				"hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0",
				className,
			)}
			{...props}
		/>
	);
});
AnimatedTabsTrigger.displayName = "AnimatedTabsTrigger";

const AnimatedTabsContent = React.forwardRef<
	HTMLDivElement,
	React.ComponentProps<typeof TabsPrimitive.Content>
>(({ className, value, children, ...props }, ref) => {
	const { contentVariant } = useAnimatedTabs();
	const variants = contentVariants[contentVariant];

	return (
		<TabsPrimitive.Content
			ref={ref}
			data-slot="animated-tabs-content"
			value={value}
			className={cn("flex-1 outline-none", className)}
			{...props}
		>
			<AnimatePresence mode="wait">
				<motion.div
					key={value}
					variants={variants}
					initial="hidden"
					animate="visible"
					exit="exit"
					className="py-2"
				>
					{children}
				</motion.div>
			</AnimatePresence>
		</TabsPrimitive.Content>
	);
});
AnimatedTabsContent.displayName = "AnimatedTabsContent";

export {
	AnimatedTabs,
	AnimatedTabsList,
	AnimatedTabsTrigger,
	AnimatedTabsContent,
};
