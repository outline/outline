import { Link } from "@tanstack/react-router";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
	AltArrowLeftLinear as ArrowLeft,
	ExportLinear as ExportIcon,
	ImportLinear as ImportIcon,
	MenuDotsLinear as MoreIcon,
	NotebookLinear as NotebookIcon,
	ChartLinear as ReportIcon,
} from "solar-icon-set";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { APP_CONFIG } from "@/lib/constants";
import { cn } from "@/shared/utils";
import { Button } from "../button/button";
import { styles } from "./page-header.styles";

export type TPageHeaderProps = {
	readonly title: string;
	readonly description?: string;
	readonly icon?: React.ElementType;
	readonly breadcrumbs?: readonly { label: string; href?: string }[];
	readonly actions?: React.ReactNode;
	readonly backHref?: string;
	readonly docHref?: string;
	readonly onImport?: () => void;
	readonly onExport?: () => void;
	readonly onReport?: () => void;
	readonly className?: string;
};

export const PageHeader = ({
	title,
	description,
	breadcrumbs,
	actions,
	backHref,
	docHref,
	onImport,
	onExport,
	onReport,
	className,
}: TPageHeaderProps) => {
	const { t } = useTranslation();

	// Rule: If parent page (root / current), don't show breadcrumbs
	const showBreadcrumbs =
		breadcrumbs &&
		breadcrumbs.length > 0 &&
		!(breadcrumbs.length <= 2 && breadcrumbs[0]?.label === APP_CONFIG.name);

	const renderDocButton = () =>
		docHref ? (
			<TooltipProvider delayDuration={0}>
				<Tooltip>
					<TooltipTrigger asChild>
						<Link to={docHref as string}>
							<Button
								variant="outline"
								size="icon"
								className="h-8 w-8 rounded-lg"
							>
								<NotebookIcon className="w-5 h-5 text-neutral-500" />
							</Button>
						</Link>
					</TooltipTrigger>
					<TooltipContent side="bottom" className="flex items-center gap-2">
						{t("nav.help")}
						<kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-1.5 font-mono text-[10px] font-medium text-neutral-400">
							⌘ D
						</kbd>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		) : null;

	const renderMoreButton = () => {
		if (!onImport && !onExport && !onReport) return null;

		return (
			<DropdownMenu>
				<TooltipProvider delayDuration={0}>
					<Tooltip>
						<TooltipTrigger asChild>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									size="icon"
									className="h-8 w-8 rounded-lg"
								>
									<MoreIcon className="w-5 h-5 text-neutral-500" />
								</Button>
							</DropdownMenuTrigger>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="flex items-center gap-2">
							{t("common.more", "Lainnya")}
							<kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-1.5 font-mono text-[10px] font-medium text-neutral-400">
								⌘ K
							</kbd>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<DropdownMenuContent align="end" className="w-48">
					{onImport && (
						<DropdownMenuItem className="gap-2" onClick={onImport}>
							<ImportIcon className="w-4 h-4 text-neutral-500" />
							<span>{t("common.import")}</span>
						</DropdownMenuItem>
					)}
					{onExport && (
						<DropdownMenuItem className="gap-2" onClick={onExport}>
							<ExportIcon className="w-4 h-4 text-neutral-500" />
							<span>{t("common.export")}</span>
						</DropdownMenuItem>
					)}
					{onReport && (
						<DropdownMenuItem className="gap-2" onClick={onReport}>
							<ReportIcon className="w-4 h-4 text-neutral-500" />
							<span>{t("common.report")}</span>
						</DropdownMenuItem>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		);
	};

	return (
		<header className={cn(styles.wrapper, className)}>
			{/* Breadcrumbs / Top Nav */}
			{showBreadcrumbs && (
				<div className={styles.topNav}>
					<div className={styles.breadcrumbList}>
						{backHref && (
							<TooltipProvider delayDuration={0}>
								<Tooltip>
									<TooltipTrigger asChild>
										<Link to={backHref as string} className={styles.backButton}>
											<ArrowLeft className="w-4 h-4" />
										</Link>
									</TooltipTrigger>
									<TooltipContent
										side="bottom"
										className="flex items-center gap-2"
									>
										{t("common.back", "Kembali")}
										<kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-1 rounded border border-neutral-700 bg-neutral-800 px-1.5 font-mono text-[10px] font-medium text-neutral-400">
											ESC
										</kbd>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)}
						{breadcrumbs.map((crumb, idx) => (
							<React.Fragment key={crumb.label}>
								{idx > 0 && <span className={styles.separator}>/</span>}
								{crumb.href ? (
									<Link
										to={crumb.href as string}
										className={styles.breadcrumbLink}
									>
										{crumb.label}
									</Link>
								) : (
									<span className={styles.breadcrumbActive}>{crumb.label}</span>
								)}
							</React.Fragment>
						))}
					</div>
					<div className="hidden md:flex items-center gap-2">
						{renderDocButton()}
						{renderMoreButton()}
						{actions && <div className={styles.actionsDesktop}>{actions}</div>}
					</div>
				</div>
			)}

			{/* Main Title Area */}
			<div className={styles.titleArea}>
				<div className="flex flex-col gap-1">
					<h1 className={styles.title}>{title}</h1>
					{description && <p className={styles.description}>{description}</p>}
				</div>
				<div className="flex items-center gap-2">
					{!showBreadcrumbs && renderDocButton()}
					{!showBreadcrumbs && renderMoreButton()}
					{!showBreadcrumbs && actions && (
						<div className={styles.actionsDesktop}>{actions}</div>
					)}
					<div className={styles.actionsMobile}>
						{renderDocButton()}
						{renderMoreButton()}
						{actions}
					</div>
				</div>
			</div>
		</header>
	);
};
