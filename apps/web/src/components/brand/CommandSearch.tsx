import { useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
	CalculatorLinear as AccountingIcon,
	CalendarLinear as BoardingIcon,
	BuildingsLinear as BranchIcon,
	WidgetLinear as DashboardIcon,
	DocumentTextLinear as OrderIcon,
	BoxLinear as ProductIcon,
	MagniferBold as SearchIcon,
	SettingsLinear as SettingsIcon,
	UsersGroupTwoRoundedLinear as StaffIcon,
	Smartphone2Linear as WhatsAppIcon,
} from "solar-icon-set";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSession } from "@/shared/hooks";

export function CommandSearch() {
	const [open, setOpen] = React.useState(false);
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { session } = useSession();

	const isMac = React.useMemo(
		() =>
			typeof navigator !== "undefined" &&
			/Mac|iPod|iPhone|iPad/.test(navigator.platform),
		[],
	);
	const modKey = isMac ? "⌘" : "Ctrl";

	React.useEffect(() => {
		const down = (e: KeyboardEvent) => {
			if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((open) => !open);
			}
		};

		document.addEventListener("keydown", down);
		return () => document.removeEventListener("keydown", down);
	}, []);

	const runCommand = React.useCallback((command: () => void) => {
		setOpen(false);
		command();
	}, []);

	const navItems = [
		{
			title: t("nav.dashboard"),
			icon: DashboardIcon,
			to: "/dashboard",
		},
		{
			title: t("nav.pos"),
			icon: ProductIcon,
			to: "/pos",
			roles: ["owner", "manager", "kasir"],
		},
		{
			title: t("nav.orders"),
			icon: OrderIcon,
			to: "/orders",
			roles: ["owner", "manager", "kasir"],
		},
		{
			title: t("nav.products"),
			icon: ProductIcon,
			to: "/products",
			roles: ["owner", "manager"],
		},
		{
			title: t("nav.boardings"),
			icon: BoardingIcon,
			to: "/boardings",
			roles: ["owner", "manager", "staff_daycare"],
		},
		{
			title: t("nav.accounting"),
			icon: AccountingIcon,
			to: "/accounting",
			roles: ["owner", "manager"],
		},
		{
			title: t("nav.whatsapp"),
			icon: WhatsAppIcon,
			to: "/whatsapp",
			roles: ["owner", "manager"],
		},
		{
			title: t("nav.branches"),
			icon: BranchIcon,
			to: "/branches",
			roles: ["owner", "manager"],
		},
		{
			title: t("nav.staff"),
			icon: StaffIcon,
			to: "/staff",
			roles: ["owner", "manager"],
		},
		{
			title: t("nav.settings"),
			icon: SettingsIcon,
			to: "/settings",
			roles: ["owner", "manager"],
		},
	];

	return (
		<>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={() => setOpen(true)}
							className="flex items-center justify-center w-8 h-8 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-200/40 active:scale-95 transition-all"
						>
							<SearchIcon className="w-[18px] h-[18px]" />
						</button>
					</TooltipTrigger>
					<TooltipContent side="bottom" className="flex items-center gap-2">
						<span>{t("common.search", "Search")}</span>
						<kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border bg-neutral-800 px-1.5 font-mono text-[10px] font-medium text-neutral-400 opacity-100">
							{modKey} K
						</kbd>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>

			<CommandDialog open={open} onOpenChange={setOpen}>
				<CommandInput
					placeholder={t(
						"common.search_placeholder",
						"Type a command or search...",
					)}
				/>
				<CommandList>
					<CommandEmpty>
						{t("common.no_results", "No results found.")}
					</CommandEmpty>
					<CommandGroup heading={t("common.navigation", "Navigation")}>
						{navItems
							.filter(
								(item) =>
									!item.roles || item.roles.includes(session?.role || ""),
							)
							.map((item) => (
								<CommandItem
									key={item.to}
									value={item.title}
									onSelect={() => runCommand(() => navigate({ to: item.to }))}
								>
									<item.icon className="mr-2 h-4 w-4" />
									<span>{item.title}</span>
								</CommandItem>
							))}
					</CommandGroup>
					<CommandSeparator />
					<CommandGroup heading={t("nav.settings", "Settings")}>
						<CommandItem
							value={t("nav.profile")}
							onSelect={() => runCommand(() => navigate({ to: "/profile" }))}
						>
							<UsersGroupTwoRoundedLinear className="mr-2 h-4 w-4" />
							<span>{t("nav.profile")}</span>
						</CommandItem>
						<CommandItem
							value={t("nav.settings")}
							onSelect={() => runCommand(() => navigate({ to: "/settings" }))}
						>
							<SettingsIcon className="mr-2 h-4 w-4" />
							<span>{t("nav.settings")}</span>
						</CommandItem>
					</CommandGroup>
				</CommandList>
			</CommandDialog>
		</>
	);
}

import { UsersGroupTwoRoundedLinear } from "solar-icon-set";
