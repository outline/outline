import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
	MagicStick3Bold as AskAiIcon,
	CheckCircleLinear as CheckIcon,
	NotebookBold as DocsIconBold,
	QuestionCircleBold as HelpIconBold,
} from "solar-icon-set";
import { CommandSearch } from "@/components/brand/CommandSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SessionInfo } from "@/domain/identity/auth/auth.functions";
import { logout } from "@/domain/identity/auth/auth.functions";
import { useLanguage } from "@/shared/i18n";
import { cn } from "@/shared/utils";

export type TAuthHeaderProps = {
	readonly session: SessionInfo | null;
	readonly topNavItems: readonly {
		to: string;
		label: string;
		icon: React.ComponentType<{ className?: string }>;
		roles?: string[];
		activePaths?: string[];
	}[];
	readonly currentPath: string;
	readonly modKey: string;
};

export const AuthHeader = ({
	session,
	topNavItems,
	currentPath,
	modKey,
}: TAuthHeaderProps) => {
	const { t } = useTranslation();
	const { language, changeLanguage } = useLanguage();
	const router = useRouter();
	const queryClient = useQueryClient();

	const handleLogout = async () => {
		try {
			await logout();
		} finally {
			queryClient.invalidateQueries({ queryKey: ["session-info"] });
			router.invalidate();
			await router.navigate({ to: "/login" });
		}
	};

	return (
		<header className="grid grid-cols-[1fr_auto_1fr] h-12 px-6 flex-shrink-0 relative z-20">
			{/* Left Column: Logo */}
			<div className="flex items-end h-full">
				<div className="flex items-center h-[38px] pb-[1px]">
					<Link
						to="/dashboard"
						className="flex items-center gap-2 text-ink-black hover:opacity-80 transition-opacity flex-shrink-0"
					>
						<div className="w-6 h-6 bg-ink-black rounded-[4px] flex items-center justify-center text-white">
							<span className="font-bold text-[12px] leading-none">P</span>
						</div>
					</Link>
				</div>
			</div>

			{/* Center Column: Navigation */}
			<nav
				className="hidden md:flex items-end justify-center gap-1 overflow-x-auto flex-nowrap h-full"
				style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
			>
				<style>{`
					nav::-webkit-scrollbar { display: none; }
					.chrome-tab {
						position: relative;
						border-top-left-radius: 12px;
						border-top-right-radius: 12px;
						padding: 0 20px;
						height: 40px;
						display: flex;
						align-items: center;
						gap: 8px;
						font-size: 13px;
						font-weight: 500;
						transition: background-color 0.2s, color 0.2s;
						transform: translateY(1px); /* Overlap container border below */
					}
					.chrome-tab-active {
						background-color: white;
						z-index: 10;
						color: #171717;
						border-top-left-radius: 12px;
						border-top-right-radius: 12px;
					}
					.chrome-tab-inactive {
						color: #737373;
						border-top-left-radius: 12px;
						border-top-right-radius: 12px;
					}
					.chrome-tab-inactive:hover {
						background-color: rgba(229, 229, 229, 0.4);
						color: #171717;
					}
					.chrome-tab-inactive + .chrome-tab-inactive::before {
						content: "";
						position: absolute;
						left: -3px;
						top: 50%;
						transform: translateY(-50%);
						height: 20px;
						width: 2px;
						background-color: rgba(12, 140, 94, 0.4); /* Brand color #0c8c5e with opacity */
						transition: opacity 0.2s;
						z-index: 1;
					}
					.chrome-tab-inactive:hover::before,
					.chrome-tab-inactive:hover + .chrome-tab-inactive::before {
						opacity: 0;
					}
					.chrome-tab-active::before,
					.chrome-tab-active::after {
						content: "";
						position: absolute;
						bottom: 0;
						width: 16px;
						height: 16px;
						pointer-events: none;
					}
					.chrome-tab-active::before {
						left: -16px;
						background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M 0 16 A 16 16 0 0 0 16 0 L 16 16 Z' fill='white'/%3E%3C/svg%3E");
					}
					.chrome-tab-active::after {
						right: -16px;
						background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M 16 16 A 16 16 0 0 1 0 0 L 0 16 Z' fill='white'/%3E%3C/svg%3E");
					}
				`}</style>
				{topNavItems
					.filter((n) => !n.roles || n.roles.includes(session?.role || ""))
					.map((n) => {
						const active =
							n.activePaths?.some((p) => currentPath.startsWith(p)) ||
							(currentPath.startsWith(n.to) && n.to !== "/dashboard") ||
							((currentPath === "/_authenticated" ||
								currentPath === "/dashboard") &&
								n.to === "/dashboard");
						return (
							<Link
								key={n.to}
								to={n.to}
								className={cn(
									"chrome-tab flex-shrink-0",
									active ? "chrome-tab-active" : "chrome-tab-inactive",
								)}
							>
								<n.icon className="w-[16px] h-[16px]" />
								{n.label}
							</Link>
						);
					})}
			</nav>

			{/* Right Column: Actions */}
			<div className="flex items-end justify-end h-full gap-3">
				<TooltipProvider>
					<div className="hidden md:flex items-center gap-0.5 mr-2 h-[38px] pb-[1px]">
						<CommandSearch />
						<Tooltip>
							<TooltipTrigger asChild>
								<a
									href="/ai"
									className="flex items-center justify-center w-8 h-8 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/40 active:scale-95 transition-all"
								>
									<AskAiIcon className="w-[18px] h-[18px]" />
								</a>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="flex items-center gap-2">
								<span>Ask AI</span>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<Link
									to="/docs"
									className="flex items-center justify-center w-8 h-8 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/40 active:scale-95 transition-all"
								>
									<DocsIconBold className="w-[18px] h-[18px]" />
								</Link>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="flex items-center gap-2">
								<span>{t("nav.docs")}</span>
							</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<a
									href="/support"
									className="flex items-center justify-center w-8 h-8 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/40 active:scale-95 transition-all"
								>
									<HelpIconBold className="w-[18px] h-[18px]" />
								</a>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="flex items-center gap-2">
								<span>{t("nav.help")}</span>
								<kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-neutral-800 px-1.5 font-mono text-[10px] font-medium text-neutral-400 opacity-100">
									{modKey} H
								</kbd>
							</TooltipContent>
						</Tooltip>
					</div>

					<div className="flex items-center h-[38px] pb-[1px]">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									className="w-6 h-6 rounded-full active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
									aria-label="User Menu"
								>
									<Avatar className="w-6 h-6">
										<AvatarImage
											src={""}
											alt={session?.email || "User avatar"}
										/>
										<AvatarFallback seed={session?.email || "User"}>
											{session?.email?.charAt(0).toUpperCase() || "U"}
										</AvatarFallback>
									</Avatar>
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-44 mt-1">
								<DropdownMenuItem className="p-0">
									<Link
										to="/profile"
										className="flex items-center gap-2 cursor-pointer w-full py-1.5 px-2.5"
									>
										<span className="text-[13px]">{t("nav.profile")}</span>
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem className="p-0">
									<Link
										to="/settings"
										className="flex items-center gap-2 cursor-pointer w-full py-1.5 px-2.5"
									>
										<span className="text-[13px]">{t("nav.settings")}</span>
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem className="p-0">
									<Link
										to="/settings/billing"
										className="flex items-center gap-2 cursor-pointer w-full py-1.5 px-2.5"
									>
										<span className="text-[13px]">{t("nav.billing")}</span>
									</Link>
								</DropdownMenuItem>

								<DropdownMenuSeparator />

								<DropdownMenuSub>
									<DropdownMenuSubTrigger className="flex items-center justify-between w-full py-1.5 cursor-pointer px-2.5">
										<span className="text-[13px]">Appearance</span>
									</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<DropdownMenuSubContent className="w-40" sideOffset={12}>
											<DropdownMenuItem className="flex items-center justify-between py-1.5 cursor-pointer px-2.5">
												<span className="text-[13px]">Light mode</span>
												<CheckIcon className="w-3.5 h-3.5 text-neutral-400" />
											</DropdownMenuItem>
											<DropdownMenuItem className="py-1.5 cursor-pointer px-2.5">
												<span className="text-[13px]">Dark mode</span>
											</DropdownMenuItem>
											<DropdownMenuItem className="py-1.5 cursor-pointer px-2.5">
												<span className="text-[13px]">System</span>
											</DropdownMenuItem>
										</DropdownMenuSubContent>
									</DropdownMenuPortal>
								</DropdownMenuSub>

								<DropdownMenuSub>
									<DropdownMenuSubTrigger className="flex items-center justify-between w-full py-1.5 cursor-pointer px-2.5">
										<span className="text-[13px]">Language</span>
									</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<DropdownMenuSubContent className="w-40" sideOffset={12}>
											{Object.entries({
												English: "en",
												Indonesia: "id",
												Jawa: "jv",
												Banjar: "bjn",
											}).map(([key, code]) => (
												<DropdownMenuItem
													key={code}
													onClick={() =>
														changeLanguage(code as "en" | "id" | "jv" | "bjn")
													}
													className="flex items-center justify-between py-1.5 cursor-pointer px-2.5"
												>
													<span className="text-[13px]">{key}</span>
													{language === code && (
														<CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
													)}
												</DropdownMenuItem>
											))}
										</DropdownMenuSubContent>
									</DropdownMenuPortal>
								</DropdownMenuSub>

								<DropdownMenuSub>
									<DropdownMenuSubTrigger className="flex items-center justify-between w-full py-1.5 cursor-pointer px-2.5">
										<span className="text-[13px]">Timezone</span>
									</DropdownMenuSubTrigger>
									<DropdownMenuPortal>
										<DropdownMenuSubContent className="w-40" sideOffset={12}>
											<DropdownMenuItem className="py-1.5 cursor-pointer text-neutral-400 text-[11px] px-2.5">
												Asia/Jakarta
											</DropdownMenuItem>
										</DropdownMenuSubContent>
									</DropdownMenuPortal>
								</DropdownMenuSub>

								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="text-rose-600 focus:text-rose-600 cursor-pointer py-1.5 mt-0.5 px-2.5"
									onClick={() => {
										void handleLogout();
									}}
								>
									<span className="text-[13px]">
										{t("nav.logout", "Log out")}
									</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</TooltipProvider>
			</div>
		</header>
	);
};
