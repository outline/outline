import { MDXProvider } from "@mdx-js/react";
import {
	createFileRoute,
	Link,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	BookBoldDuotone as BookOpen,
	AltArrowRightLinear as ChevronRight,
	LayersBoldDuotone as Layers,
	PieChartBoldDuotone as LayoutDashboard,
	HamburgerMenuLinear as Menu,
	MagniferLinear as Search,
	UsersGroupRoundedBoldDuotone as Users,
	BoltBoldDuotone as Zap,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ScrollArea from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/shared/hooks";
import { i18n } from "@/shared/i18n/i18n.config";
import { cn } from "@/shared/utils";

export const Route = createFileRoute("/docs")({
	head: () => ({
		meta: [
			{ title: "Docs — Peso" },
			{
				name: "description",
				content: "Dokumentasi dan panduan lengkap penggunaan Petso.",
			},
		],
	}),
	component: DocsLayout,
});

const GithubIcon = ({ className }: { className?: string }) => (
	<svg
		aria-hidden="true"
		viewBox="0 0 24 24"
		fill="currentColor"
		className={className}
	>
		<path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
	</svg>
);
const CursorLogo = ({ className }: { className?: string }) => (
	<svg
		aria-hidden="true"
		viewBox="0 0 24 24"
		fill="currentColor"
		className={className}
	>
		<path d="M5.5 3L18.5 12L11 14L9.5 21L5.5 3Z" />
	</svg>
);
const ChatGPTLogo = ({ className }: { className?: string }) => (
	<svg
		aria-hidden="true"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<circle cx="12" cy="12" r="10" />
		<path d="M12 2a14.5 14.5 0 0 0 0 20M2 12h20" />
	</svg>
);
const ClaudeLogo = ({ className }: { className?: string }) => (
	<svg
		aria-hidden="true"
		viewBox="0 0 24 24"
		fill="currentColor"
		className={className}
	>
		<path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z" />
	</svg>
);

function DocActions() {
	const handleCopy = () => {
		const content = document.getElementById("mdx-content")?.innerText || "";
		navigator.clipboard.writeText(content);
		toast.success(i18n.t("toast.copied"), {
			description: "Markdown content has been copied.",
		});
	};

	return (
		<div className="flex items-center gap-2.5 mb-8 pb-8 border-b border-neutral-200">
			<Button
				variant="outline"
				size="sm"
				onClick={handleCopy}
				className="h-[34px] px-4 text-[13px] font-medium bg-[#f4f4f5] hover:bg-[#e4e4e7] border border-neutral-200 text-neutral-800 rounded-lg  transition-colors"
			>
				<svg
					aria-hidden="true"
					className="w-4 h-4 mr-2 opacity-60"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
				</svg>
				Copy Markdown
			</Button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className="h-[34px] px-4 text-[13px] font-medium bg-[#f4f4f5] hover:bg-[#e4e4e7] border border-neutral-200 text-neutral-800 rounded-lg  transition-colors"
					>
						Open
						<svg
							aria-hidden="true"
							className="w-3.5 h-3.5 ml-2 opacity-60"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="6 9 12 15 18 9"></polyline>
						</svg>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent
					align="start"
					className="w-[220px] p-2 rounded-lg  border border-neutral-200/60 bg-white"
				>
					<DropdownMenuItem
						className="text-[13px] text-neutral-700 py-2 px-2.5 cursor-pointer focus:bg-neutral-100 rounded-lg"
						onClick={() => window.open("https://github.com", "_blank")}
					>
						<GithubIcon className="w-[18px] h-[18px] mr-2.5 text-neutral-900" />
						Open in GitHub
						<svg
							aria-hidden="true"
							className="w-3.5 h-3.5 ml-auto opacity-40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
							<polyline points="15 3 21 3 21 9"></polyline>
							<line x1="10" y1="14" x2="21" y2="3"></line>
						</svg>
					</DropdownMenuItem>
					<DropdownMenuItem className="text-[13px] text-neutral-700 py-2 px-2.5 cursor-pointer focus:bg-neutral-100 rounded-lg">
						<svg
							aria-hidden="true"
							className="w-[18px] h-[18px] mr-2.5 text-neutral-600"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<line x1="21" y1="6" x2="3" y2="6"></line>
							<line x1="15" y1="12" x2="3" y2="12"></line>
							<line x1="17" y1="18" x2="3" y2="18"></line>
						</svg>
						View as Markdown
						<svg
							aria-hidden="true"
							className="w-3.5 h-3.5 ml-auto opacity-40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
							<polyline points="15 3 21 3 21 9"></polyline>
							<line x1="10" y1="14" x2="21" y2="3"></line>
						</svg>
					</DropdownMenuItem>
					<DropdownMenuItem className="text-[13px] text-neutral-700 py-2 px-2.5 cursor-pointer focus:bg-neutral-100 rounded-lg">
						<svg
							aria-hidden="true"
							className="w-[18px] h-[18px] mr-2.5 text-neutral-600"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M12 3v18"></path>
							<path d="M3 12h18"></path>
							<path d="m18 6-6 6"></path>
							<path d="m6 6 6 6"></path>
						</svg>
						Open in Scira AI
						<svg
							aria-hidden="true"
							className="w-3.5 h-3.5 ml-auto opacity-40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
							<polyline points="15 3 21 3 21 9"></polyline>
							<line x1="10" y1="14" x2="21" y2="3"></line>
						</svg>
					</DropdownMenuItem>
					<DropdownMenuItem className="text-[13px] text-neutral-700 py-2 px-2.5 cursor-pointer focus:bg-neutral-100 rounded-lg">
						<ChatGPTLogo className="w-[18px] h-[18px] mr-2.5 text-neutral-600" />
						Open in ChatGPT
						<svg
							aria-hidden="true"
							className="w-3.5 h-3.5 ml-auto opacity-40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
							<polyline points="15 3 21 3 21 9"></polyline>
							<line x1="10" y1="14" x2="21" y2="3"></line>
						</svg>
					</DropdownMenuItem>
					<DropdownMenuItem className="text-[13px] text-neutral-700 py-2 px-2.5 cursor-pointer focus:bg-neutral-100 rounded-lg">
						<ClaudeLogo className="w-[18px] h-[18px] mr-2.5 text-neutral-600" />
						Open in Claude
						<svg
							aria-hidden="true"
							className="w-3.5 h-3.5 ml-auto opacity-40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
							<polyline points="15 3 21 3 21 9"></polyline>
							<line x1="10" y1="14" x2="21" y2="3"></line>
						</svg>
					</DropdownMenuItem>
					<DropdownMenuItem className="text-[13px] text-neutral-700 py-2 px-2.5 cursor-pointer focus:bg-neutral-100 rounded-lg">
						<CursorLogo className="w-[18px] h-[18px] mr-2.5 text-neutral-900" />
						Open in Cursor
						<svg
							aria-hidden="true"
							className="w-3.5 h-3.5 ml-auto opacity-40"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
							<polyline points="15 3 21 3 21 9"></polyline>
							<line x1="10" y1="14" x2="21" y2="3"></line>
						</svg>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

const docsIndex = [
	{
		title: "Introduction",
		description: "Overview of Petso platform and core capabilities",
		href: "/docs",
		category: "Getting Started",
	},
	{
		title: "Dashboard",
		description: "Real-time metrics and business overview",
		href: "/docs/dashboard",
		category: "Features",
	},
	{
		title: "POS",
		description: "Point of Sale checkout and payment processing",
		href: "/docs/pos",
		category: "Features",
	},
	{
		title: "Products",
		description: "Product catalog and inventory management",
		href: "/docs/products",
		category: "Features",
	},
	{
		title: "Boarding",
		description: "Pet check-in, check-out, and status tracking",
		href: "/docs/boarding",
		category: "Features",
	},
	{
		title: "Branches",
		description: "Multi-location management and branch switching",
		href: "/docs/branches",
		category: "Features",
	},
	{
		title: "Staff",
		description: "Team management and role-based access",
		href: "/docs/staff",
		category: "Features",
	},
	{
		title: "Loyalty",
		description: "Points-based customer rewards and tiers",
		href: "/docs/loyalty",
		category: "Features",
	},
	{
		title: "Accounting",
		description: "Financial summaries, expenses, and petty cash",
		href: "/docs/accounting",
		category: "Features",
	},
	{
		title: "WhatsApp",
		description: "Automated notifications and message templates",
		href: "/docs/whatsapp",
		category: "Features",
	},
	{
		title: "Authentication",
		description: "Login, signup, and session management",
		href: "/docs/auth",
		category: "Reference",
	},
	{
		title: "Auth Stories",
		description: "User scenarios for authentication",
		href: "/docs/stories/auth",
		category: "User Stories",
	},
	{
		title: "Branch Stories",
		description: "User scenarios for branch management",
		href: "/docs/stories/branches",
		category: "User Stories",
	},
	{
		title: "Boarding Stories",
		description: "User scenarios for pet boarding",
		href: "/docs/stories/boarding",
		category: "User Stories",
	},
];

const components = {
	h1: (props: React.ComponentPropsWithoutRef<"h1">) => (
		<h1
			className="text-[32px] font-bold tracking-tight text-neutral-900 mb-4 mt-2"
			{...props}
		/>
	),
	h2: (props: React.ComponentPropsWithoutRef<"h2">) => {
		const id =
			props.id ||
			String(props.children)
				.toLowerCase()
				.replace(/[^\w\s-]/g, "")
				.replace(/\s+/g, "-");
		return (
			<h2
				id={id}
				className="text-[22px] font-semibold tracking-tight text-neutral-900 mt-10 mb-4 scroll-mt-24 group"
				{...props}
			/>
		);
	},
	h3: (props: React.ComponentPropsWithoutRef<"h3">) => {
		const id =
			props.id ||
			String(props.children)
				.toLowerCase()
				.replace(/[^\w\s-]/g, "")
				.replace(/\s+/g, "-");
		return (
			<h3
				id={id}
				className="text-[18px] font-semibold tracking-tight text-neutral-900 mt-8 mb-4 scroll-mt-24 group"
				{...props}
			/>
		);
	},
	h4: (props: React.ComponentPropsWithoutRef<"h4">) => (
		<h4
			className="text-[16px] font-semibold tracking-tight text-neutral-900 mt-6 mb-3"
			{...props}
		/>
	),
	h5: (props: React.ComponentPropsWithoutRef<"h5">) => (
		<h5
			className="text-[15px] font-semibold tracking-tight text-neutral-900 mt-6 mb-2"
			{...props}
		/>
	),
	h6: (props: React.ComponentPropsWithoutRef<"h6">) => (
		<h6
			className="text-[14px] font-semibold tracking-tight text-neutral-900 mt-6 mb-2 uppercase"
			{...props}
		/>
	),
	p: (props: React.ComponentPropsWithoutRef<"p">) => (
		<p
			className="text-[16px] text-neutral-600 leading-relaxed mb-6"
			{...props}
		/>
	),
	a: (props: React.ComponentPropsWithoutRef<"a">) => (
		<a
			className="text-mint-green hover:text-mint-green/80 font-medium underline underline-offset-4 transition-colors"
			{...props}
		/>
	),
	ul: (props: React.ComponentPropsWithoutRef<"ul">) => (
		<ul
			className="list-disc list-inside space-y-2 mb-6 text-true-black/60 marker:text-mist-gray"
			{...props}
		/>
	),
	ol: (props: React.ComponentPropsWithoutRef<"ol">) => (
		<ol
			className="list-decimal pl-6 mb-6 text-[15px] text-true-black/70 space-y-2 marker:text-true-black/40 marker:font-medium"
			{...props}
		/>
	),
	li: (props: React.ComponentPropsWithoutRef<"li">) => (
		<li className="pl-1" {...props} />
	),
	hr: (props: React.ComponentPropsWithoutRef<"hr">) => (
		<hr className="my-10 border-mist-gray" {...props} />
	),
	img: (props: React.ComponentPropsWithoutRef<"img">) => (
		<img
			className="rounded-lg border border-mist-gray  my-8 w-full h-auto"
			alt={props.alt || "Documentation image"}
			{...props}
		/>
	),
	code: (props: React.ComponentPropsWithoutRef<"code">) => {
		const isBlock = props.className?.includes("language-");
		return (
			<code
				className={
					isBlock
						? "font-mono text-sm"
						: "bg-mist-gray/50 px-1.5 py-0.5 rounded text-mint-green font-mono text-[14px]"
				}
				{...props}
			/>
		);
	},
	pre: (props: React.ComponentPropsWithoutRef<"pre">) => (
		<pre
			className="bg-mist-gray/30 rounded-lg p-6 border border-mist-gray font-mono text-sm overflow-x-auto mb-8"
			{...props}
		/>
	),
	strong: (props: React.ComponentPropsWithoutRef<"strong">) => (
		<strong className="font-semibold text-ink-black" {...props} />
	),
	em: (props: React.ComponentPropsWithoutRef<"em">) => (
		<em className="italic text-true-black/80" {...props} />
	),
	del: (props: React.ComponentPropsWithoutRef<"del">) => (
		<del className="line-through text-true-black/40" {...props} />
	),
	kbd: (props: React.ComponentPropsWithoutRef<"kbd">) => (
		<kbd
			className="px-1.5 py-0.5 text-xs font-mono font-medium text-true-black/70 bg-mist-gray/50 border border-mist-gray rounded-md  mx-1"
			{...props}
		/>
	),
	blockquote: (props: React.ComponentPropsWithoutRef<"blockquote">) => (
		<blockquote
			className="border-l-4 border-mint-green/50 pl-6 py-1 italic text-true-black/60 bg-mint-green/5 rounded-r-lg my-6"
			{...props}
		/>
	),
	table: (props: React.ComponentPropsWithoutRef<"table">) => (
		<div className="w-full overflow-x-auto mb-8 rounded-lg border border-mist-gray">
			<table className="w-full text-left text-sm" {...props} />
		</div>
	),
	thead: (props: React.ComponentPropsWithoutRef<"thead">) => (
		<thead
			className="bg-mist-gray/30 text-ink-black font-semibold border-b border-mist-gray"
			{...props}
		/>
	),
	tbody: (props: React.ComponentPropsWithoutRef<"tbody">) => (
		<tbody className="divide-y divide-mist-gray/50" {...props} />
	),
	tr: (props: React.ComponentPropsWithoutRef<"tr">) => (
		<tr className="hover:bg-mist-gray/10 transition-colors" {...props} />
	),
	th: (props: React.ComponentPropsWithoutRef<"th">) => (
		<th className="px-4 py-3 align-middle" {...props} />
	),
	td: (props: React.ComponentPropsWithoutRef<"td">) => (
		<td className="px-4 py-3 align-middle text-true-black/80" {...props} />
	),
};

const navigation = [
	{
		title: "Introduction",
		href: "/docs",
		icon: BookOpen,
	},
	{
		title: "Core Features",
		icon: Layers,
		items: [
			{ title: "Dashboard", href: "/docs/dashboard", icon: LayoutDashboard },
			{ title: "Point of Sale", href: "/docs/pos", icon: Zap },
			{ title: "Products", href: "/docs/products", icon: Layers },
			{ title: "Boarding", href: "/docs/boarding", icon: Users },
		],
	},
	{
		title: "Management",
		icon: Users,
		items: [
			{ title: "Branches", href: "/docs/branches", icon: Layers },
			{ title: "Staff", href: "/docs/staff", icon: Users },
			{ title: "Loyalty", href: "/docs/loyalty", icon: Zap },
		],
	},
	{
		title: "Business",
		icon: LayoutDashboard,
		items: [
			{ title: "Accounting", href: "/docs/accounting", icon: LayoutDashboard },
			{ title: "WhatsApp", href: "/docs/whatsapp", icon: Zap },
		],
	},
	{
		title: "Reference",
		icon: Zap,
		items: [
			{ title: "Authentication", href: "/docs/auth", icon: Zap },
			{ title: "Auth Stories", href: "/docs/stories/auth", icon: Users },
			{ title: "Branch Stories", href: "/docs/stories/branches", icon: Layers },
			{
				title: "Boarding Stories",
				href: "/docs/stories/boarding",
				icon: Users,
			},
		],
	},
];

// Custom hook for TOC headings
function useHeadings() {
	const [headings, setHeadings] = useState<
		{ id: string; title: string; level: number }[]
	>([]);
	const [activeId, setActiveId] = useState<string>("");
	const location = useLocation();

	useEffect(() => {
		const _trigger = location.pathname; // satisfy linter for route change
		const timer = setTimeout(() => {
			const elements = Array.from(
				document.querySelectorAll("#mdx-content h2, #mdx-content h3"),
			);
			const headingData = elements.map((elem) => ({
				id: elem.getAttribute("id") || "",
				title: elem.textContent || "",
				level: elem.tagName === "H2" ? 2 : 3,
			}));
			setHeadings(headingData);
			if (headingData.length > 0) setActiveId(headingData[0]?.id || "");
		}, 100);
		return () => clearTimeout(timer);
	}, [location.pathname]);

	useEffect(() => {
		const _trigger = headings.length; // satisfy linter
		const elements = Array.from(
			document.querySelectorAll("#mdx-content h2, #mdx-content h3"),
		);
		if (elements.length === 0) return;

		const observer = new IntersectionObserver(
			(entries) => {
				// Find the last intersecting element
				const visibleEntries = entries.filter((entry) => entry.isIntersecting);
				if (visibleEntries.length > 0) {
					setActiveId(
						visibleEntries[visibleEntries.length - 1]?.target.getAttribute(
							"id",
						) || "",
					);
				}
			},
			{ rootMargin: "-80px 0px -80% 0px" },
		);

		elements.forEach((elem) => {
			observer.observe(elem);
		});
		return () => observer.disconnect();
	}, [headings]);

	return { headings, activeId };
}

function DocsLayout() {
	const { session, isLoading } = useSession();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
	const [expandedSections, setExpandedSections] = useState<
		Record<string, boolean>
	>({});
	const navigate = useNavigate();
	const location = useLocation();
	const { headings, activeId } = useHeadings();

	const toggleSection = (title: string) => {
		setExpandedSections((prev) => ({
			...prev,
			[title]: prev[title] === false,
		}));
	};

	// Calculate pagination
	const currentPath = location.pathname.replace(/\/$/, "");
	const currentIndex = docsIndex.findIndex(
		(item) => item.href.replace(/\/$/, "") === currentPath,
	);
	const prevPage = currentIndex > 0 ? docsIndex[currentIndex - 1] : null;
	const nextPage =
		currentIndex !== -1 && currentIndex < docsIndex.length - 1
			? docsIndex[currentIndex + 1]
			: null;

	useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setIsSearchOpen((open) => !open);
			}
		};
		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	return (
		<div className="flex h-screen bg-paper-white font-sans text-true-black overflow-hidden selection:bg-mint-green/30">
			{/* Search Dialog */}
			<CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
				<CommandInput placeholder="Type to search documentation..." />
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					<CommandGroup heading="Documentation">
						{docsIndex.map((item) => (
							<CommandItem
								key={item.href}
								onSelect={() => {
									navigate({ to: item.href });
									setIsSearchOpen(false);
								}}
								className="flex flex-col items-start gap-1 p-3 cursor-pointer"
							>
								<div className="flex items-center gap-2">
									<BookOpen className="w-4 h-4 text-mint-green" />
									<span className="font-medium text-ink-black">
										{item.title}
									</span>
									<span className="text-[10px] uppercase tracking-wider text-true-black/30 px-1.5 py-0.5 bg-mist-gray rounded">
										{item.category}
									</span>
								</div>
								<p className="text-xs text-true-black/50">{item.description}</p>
							</CommandItem>
						))}
					</CommandGroup>
				</CommandList>
			</CommandDialog>

			{/* Mobile Sidebar Overlay */}
			{isMobileMenuOpen && (
				<Button
					variant="ghost"
					className="fixed inset-0 z-40 bg-ink-black/20 backdrop-blur-sm lg:hidden w-full h-full border-none cursor-default"
					onClick={() => setIsMobileMenuOpen(false)}
					aria-label="Close menu"
				/>
			)}

			{/* Sidebar */}
			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-50 bg-[#f4f4f5] transition-all duration-300 lg:static flex flex-col border-r border-neutral-200/50 overflow-hidden",
					isMobileMenuOpen
						? "translate-x-0 w-[280px]"
						: "-translate-x-full w-[280px]",
					isSidebarCollapsed
						? "lg:w-0 lg:border-none lg:opacity-0"
						: "lg:w-[280px] lg:translate-x-0",
				)}
			>
				<div className="flex h-16 shrink-0 items-center justify-between px-6">
					<Link to="/" className="flex items-center gap-2">
						<div className="w-5 h-5 bg-mint-green rounded-[3px] flex items-center justify-center">
							<div className="w-2.5 h-2.5 bg-paper-white rounded-sm" />
						</div>
						<span className="text-[15px] font-semibold tracking-tight text-neutral-800">
							Petso Docs
						</span>
					</Link>
					<button
						type="button"
						onClick={() => setIsSidebarCollapsed(true)}
						className="hidden lg:flex w-7 h-7 items-center justify-center rounded-md text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/50 transition-colors"
					>
						<svg
							aria-hidden="true"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
							<path d="M9 3v18" />
						</svg>
					</button>
				</div>
				<ScrollArea className="flex-1 px-4 py-4 min-w-[280px]">
					<nav className="space-y-4">
						{navigation.map((section) => {
							if (!section.items) {
								const isActive =
									currentPath === section.href ||
									(currentPath === "/docs" && section.href === "/docs");
								return (
									<Link
										key={section.title}
										to={section.href || ""}
										className={cn(
											"flex items-center gap-3 px-2 py-2 text-[14px] font-medium transition-colors rounded-lg",
											isActive
												? "bg-[#e4e4e7] text-neutral-900"
												: "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50",
										)}
										onClick={() => setIsMobileMenuOpen(false)}
									>
										{section.icon && (
											<section.icon
												className={cn(
													"w-[18px] h-[18px] shrink-0",
													isActive ? "opacity-100" : "opacity-70",
												)}
											/>
										)}
										<span>{section.title}</span>
									</Link>
								);
							}

							const isExpanded = expandedSections[section.title] !== false;
							return (
								<div key={section.title} className="space-y-1">
									<button
										type="button"
										onClick={() => toggleSection(section.title)}
										className="w-full flex items-center justify-between px-2 py-2 text-[14px] font-medium text-neutral-600 cursor-pointer hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-200/50"
									>
										<div className="flex items-center gap-3">
											{section.icon ? (
												<section.icon className="w-[18px] h-[18px] opacity-70" />
											) : (
												<Layers className="w-[18px] h-[18px] opacity-70" />
											)}
											{section.title}
										</div>
										<ChevronRight
											className={cn(
												"w-4 h-4 transition-transform duration-200 opacity-50",
												isExpanded ? "rotate-90" : "",
											)}
										/>
									</button>
									<div
										className={cn(
											"grid transition-all duration-200 ease-in-out",
											isExpanded
												? "grid-rows-[1fr] opacity-100"
												: "grid-rows-[0fr] opacity-0",
										)}
									>
										<div className="overflow-hidden min-h-0">
											<ul className="ml-[1.125rem] border-l border-neutral-200/80 space-y-1">
												<div className="py-1 space-y-1">
													{section.items.map((item) => {
														const isActive =
															currentPath === item.href ||
															(currentPath === "/docs" &&
																item.href === "/docs");
														return (
															<li key={item.title}>
																<Link
																	to={item.href}
																	className={cn(
																		"relative flex items-center gap-3 rounded-lg py-2 pr-3 pl-[30px] -ml-[14px] text-[13.5px] font-medium transition-all",
																		isActive
																			? "bg-[#e4e4e7] text-neutral-900"
																			: "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/50",
																	)}
																	onClick={() => setIsMobileMenuOpen(false)}
																>
																	{isActive && (
																		<div className="absolute left-[13px] top-1/2 -translate-y-1/2 w-[2px] h-[18px] bg-neutral-900 rounded-full" />
																	)}
																	<item.icon
																		className={cn(
																			"h-[18px] w-[18px] shrink-0",
																			isActive ? "opacity-100" : "opacity-60",
																		)}
																	/>
																	<span className="truncate">{item.title}</span>
																</Link>
															</li>
														);
													})}
												</div>
											</ul>
										</div>
									</div>
								</div>
							);
						})}
					</nav>
				</ScrollArea>

				<div className="p-4 mt-auto">
					<div className="flex items-center justify-between bg-neutral-200/50 rounded-lg p-2">
						<div className="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center opacity-50 hover:opacity-100 cursor-pointer transition-opacity">
							<span className="text-[10px] font-bold">GH</span>
						</div>
						<div className="flex items-center gap-1 bg-neutral-200 rounded-lg p-1">
							<div className="w-6 h-6 rounded-md bg-white  flex items-center justify-center cursor-pointer">
								<span className="text-[10px]">☀️</span>
							</div>
							<div className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
								<span className="text-[10px]">🌙</span>
							</div>
						</div>
					</div>
				</div>
			</aside>

			{/* Main Content Area */}
			<div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-paper-white">
				{/* Header */}
				<header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-neutral-200/50 bg-paper-white/80 px-6 backdrop-blur-md">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="icon"
							className="lg:hidden -ml-2 text-neutral-600 hover:text-neutral-900"
							onClick={() => setIsMobileMenuOpen(true)}
						>
							<Menu className="h-5 w-5" />
						</Button>
						{isSidebarCollapsed && (
							<Button
								variant="ghost"
								size="icon"
								className="hidden lg:flex -ml-2 text-neutral-600 hover:text-neutral-900"
								onClick={() => setIsSidebarCollapsed(false)}
							>
								<svg
									aria-hidden="true"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
									<path d="M9 3v18" />
								</svg>
							</Button>
						)}
						<div className="hidden lg:flex items-center text-[14px] text-neutral-400 font-medium">
							{currentPath === "/docs" ? (
								<span className="text-neutral-800">Introduction</span>
							) : (
								<>
									<span>Docs</span>
									<ChevronRight className="h-4 w-4 mx-1" />
									<span className="text-neutral-800">
										{docsIndex[currentIndex]?.title}
									</span>
								</>
							)}
						</div>
					</div>

					<div className="flex items-center gap-4">
						<button
							type="button"
							onClick={() => setIsSearchOpen(true)}
							className="flex items-center gap-2 bg-[#f4f4f5] hover:bg-[#e4e4e7] transition-colors rounded-full px-4 py-2 text-[13px] font-medium text-neutral-500 border border-neutral-200/50 w-[240px] "
						>
							<Search className="w-4 h-4 shrink-0 text-neutral-400" />
							<span className="truncate">Search documentation...</span>
							<kbd className="ml-auto shrink-0 flex h-5 items-center gap-1 rounded bg-white px-1.5 font-mono text-[10px] font-semibold text-neutral-500  border border-neutral-200">
								<span className="text-xs">⌘</span>K
							</kbd>
						</button>
						<div className="h-6 w-px bg-mist-gray" />
						{isLoading ? (
							<Skeleton className="w-16 h-8 rounded-md" />
						) : session ? (
							<Link
								to="/dashboard"
								className="text-sm font-medium hover:text-mint-green transition-colors"
							>
								<Button size="sm">Dashboard</Button>
							</Link>
						) : (
							<Link
								to="/login"
								className="text-sm font-medium hover:text-mint-green transition-colors"
							>
								Sign in
							</Link>
						)}
					</div>
				</header>

				{/* Two Column Layout for Docs Content and TOC */}
				<main className="flex-1 min-h-0 w-full relative">
					<ScrollArea className="w-full h-full">
						<div className="max-w-[1200px] mx-auto flex items-start">
							{/* MDX Content Column */}
							<div className="flex-1 min-w-0 py-12 px-6 lg:px-12 max-w-[800px]">
								{docsIndex[currentIndex]?.category && (
									<div className="mb-2 text-[14px] font-semibold text-neutral-600">
										{docsIndex[currentIndex].category}
									</div>
								)}
								{docsIndex[currentIndex]?.title && (
									<>
										<h1 className="text-[32px] font-bold tracking-tight text-neutral-900 mb-4 mt-2">
											{docsIndex[currentIndex].title}
										</h1>
										<p className="text-[16px] text-neutral-600 leading-relaxed mb-6">
											{docsIndex[currentIndex].description}
										</p>
										<DocActions />
									</>
								)}
								<div id="mdx-content">
									<MDXProvider>
										<Outlet />
									</MDXProvider>
								</div>

								{/* Pagination Footer */}
								<div className="mt-20 pt-8 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
									{prevPage ? (
										<Link
											to={prevPage.href}
											className="flex flex-col items-start gap-1 p-4 rounded-lg border border-neutral-200 hover:border-mint-green/50 hover:bg-mint-green/5 transition-all w-full sm:w-1/2 group"
										>
											<span className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider group-hover:text-mint-green">
												Previous
											</span>
											<span className="text-[15px] font-medium text-neutral-800 flex items-center gap-2">
												<ChevronRight className="w-4 h-4 rotate-180 opacity-50 group-hover:opacity-100 group-hover:text-mint-green" />
												{prevPage.title}
											</span>
										</Link>
									) : (
										<div className="w-full sm:w-1/2" />
									)}

									{nextPage ? (
										<Link
											to={nextPage.href}
											className="flex flex-col items-end gap-1 p-4 rounded-lg border border-neutral-200 hover:border-mint-green/50 hover:bg-mint-green/5 transition-all w-full sm:w-1/2 group text-right"
										>
											<span className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider group-hover:text-mint-green">
												Next
											</span>
											<span className="text-[15px] font-medium text-neutral-800 flex items-center gap-2">
												{nextPage.title}
												<ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:text-mint-green" />
											</span>
										</Link>
									) : (
										<div className="w-full sm:w-1/2" />
									)}
								</div>

								{/* Footer */}
								<footer className="mt-20 pt-10 border-t border-neutral-200">
									<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
										<div className="space-y-1">
											<div className="flex items-center gap-2 mb-2">
												<div className="w-4 h-4 bg-mint-green rounded-[2px] flex items-center justify-center text-[8px] text-paper-white font-bold">
													P
												</div>
												<span className="text-xs font-semibold tracking-tight uppercase">
													Petso
												</span>
											</div>
											<p className="text-xs text-neutral-400">
												© 2026 Petso Inc. All-in-one platform for pet care
												businesses.
											</p>
										</div>
										<div className="flex gap-8">
											<Link
												to="/"
												className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors"
											>
												Website
											</Link>
											<Link
												to="/contact"
												className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors"
											>
												Contact
											</Link>
											<Link
												to="/privacy"
												className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors"
											>
												Privacy
											</Link>
										</div>
									</div>
								</footer>
							</div>

							{/* Right TOC Sidebar */}
							{headings.length > 0 && (
								<aside className="hidden xl:block w-[240px] shrink-0 py-12 pr-8 sticky top-0 max-h-screen overflow-y-auto">
									<div className="space-y-4">
										<div className="flex items-center gap-2 text-[14px] font-semibold text-neutral-800 mb-6">
											<svg
												aria-hidden="true"
												className="w-[18px] h-[18px] opacity-70"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<line x1="8" y1="6" x2="21" y2="6"></line>
												<line x1="8" y1="12" x2="21" y2="12"></line>
												<line x1="8" y1="18" x2="21" y2="18"></line>
												<line x1="3" y1="6" x2="3.01" y2="6"></line>
												<line x1="3" y1="12" x2="3.01" y2="12"></line>
												<line x1="3" y1="18" x2="3.01" y2="18"></line>
											</svg>
											On this page
										</div>
										<ul className="text-[13px] border-l border-neutral-200 relative space-y-1">
											{headings.map((heading) => {
												const isActive = activeId === heading.id;
												return (
													<li key={heading.id} className="relative">
														{isActive && (
															<>
																<div className="absolute left-[-0.5px] top-[10px] bottom-0 w-[2px] bg-neutral-900 -translate-x-1/2" />
																<div className="absolute left-[-0.5px] top-[8px] w-1.5 h-1.5 rounded-full bg-neutral-900 -translate-x-1/2" />
															</>
														)}
														<a
															href={`#${heading.id}`}
															className={cn(
																"block py-2 transition-colors",
																heading.level === 3 ? "pl-6" : "pl-4",
																isActive
																	? "text-neutral-900 font-semibold"
																	: "text-neutral-500 hover:text-neutral-800",
															)}
															onClick={(e) => {
																e.preventDefault();
																document
																	.getElementById(heading.id)
																	?.scrollIntoView({ behavior: "smooth" });
																window.history.pushState(
																	null,
																	"",
																	`#${heading.id}`,
																);
															}}
														>
															{heading.title}
														</a>
													</li>
												);
											})}
										</ul>
									</div>
								</aside>
							)}
						</div>
					</ScrollArea>
				</main>
			</div>
		</div>
	);
}
