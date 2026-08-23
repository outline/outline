import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_CONFIG } from "@/lib/constants";
import { ProgressiveImage } from "@/shared/components/ProgressiveImage";
import {
	GITHUB_RELEASES_BASE,
	platformConfigs,
	usePlatformDetection,
} from "@/shared/hooks/usePlatformDetection";

export const Route = createFileRoute("/download")({
	head: () => ({
		meta: [
			{ title: `Download ${APP_CONFIG.name}` },
			{
				name: "description",
				content:
					"Download for your desktop. Available for macOS (Intel & Apple Silicon), Windows, and Linux.",
			},
		],
	}),
	component: DownloadPage,
});

type MacChipOption = "intel" | "m-series";

interface PlatformIconProps {
	src: string;
	alt: string;
	className?: string;
}

function PlatformIcon({ src, alt, className = "h-4 w-4" }: PlatformIconProps) {
	return (
		<div className="relative flex shrink-0 items-center justify-center">
			<img src={src} alt={alt} className={className} />
		</div>
	);
}

function DownloadSectionLayout({
	webpSrc,
	pngSrc,
	imageAlt,
	imagePosition = "left",
	imageClassName = "object-cover object-bottom",
	contentAlignment = "center",
	chip,
	title,
	description,
	actions,
	extraContent,
}: {
	webpSrc: string;
	pngSrc: string;
	imageAlt: string;
	imagePosition?: "left" | "right";
	imageClassName?: string;
	contentAlignment?: "left" | "right" | "center";
	chip?: React.ReactNode;
	title: string;
	description: string;
	actions: React.ReactNode;
	extraContent?: React.ReactNode;
}) {
	const alignmentClasses = {
		left: "md:items-start md:text-left",
		right: "md:items-end md:text-right",
		center: "md:items-center md:text-center",
	};

	return (
		<section className="relative z-10 w-full max-w-5xl mx-auto px-6 py-16">
			<div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
				{/* Screenshot */}
				<div
					className={`relative aspect-video w-full overflow-hidden rounded-3xl border border-border bg-zinc-50 ${
						imagePosition === "right" ? "md:order-2" : ""
					}`}
				>
					<ProgressiveImage
						webpSrc={webpSrc}
						pngSrc={pngSrc}
						alt={imageAlt}
						className={imageClassName}
					/>
				</div>

				{/* Content */}
				<div
					className={`flex flex-col items-center gap-6 text-center ${alignmentClasses[contentAlignment]}`}
				>
					{chip}
					<div className="flex flex-col gap-2">
						<h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
							{title}
						</h2>
						<p className="text-muted-foreground text-sm">{description}</p>
					</div>

					{actions}

					{extraContent}
				</div>
			</div>
		</section>
	);
}

function MacDownloadButton({ isPrimary = false }: { isPrimary?: boolean }) {
	const [selectedOption, setSelectedOption] = useState<Set<MacChipOption>>(
		new Set(["intel"]),
	);

	const downloadUrlMap: Record<MacChipOption, string> = {
		intel: platformConfigs["mac-intel"].downloadUrl || "#",
		"m-series": platformConfigs["mac-arm"].downloadUrl || "#",
	};

	const selectedOptionValue = Array.from(selectedOption)[0] as MacChipOption;

	const trigger = isPrimary ? (
		<Button asChild size="lg">
			<a
				href={downloadUrlMap[selectedOptionValue]}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-2"
			>
				<PlatformIcon src="/images/icons/apple.svg" alt="Apple" />
				{selectedOptionValue === "intel"
					? "Download macOS Intel"
					: "Download M-series"}
			</a>
		</Button>
	) : (
		<Button variant="outline" asChild>
			<a
				href={downloadUrlMap[selectedOptionValue]}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-2"
			>
				<PlatformIcon src="/images/icons/apple.svg" alt="Apple" />
				{selectedOptionValue === "intel" ? "macOS Intel" : "macOS M-series"}
			</a>
		</Button>
	);

	return (
		<div className="flex items-center gap-2">
			{trigger}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant={isPrimary ? "default" : "outline"} size="icon">
						<ChevronDown className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						onClick={() => setSelectedOption(new Set(["intel"]))}
						className={
							Array.from(selectedOption)[0] === "intel" ? "bg-accent" : ""
						}
					>
						<div>
							<div className="font-medium">Intel</div>
							<div className="text-xs text-muted-foreground">
								For Macs with Intel processor
							</div>
						</div>
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => setSelectedOption(new Set(["m-series"]))}
						className={
							Array.from(selectedOption)[0] === "m-series" ? "bg-accent" : ""
						}
					>
						<div>
							<div className="font-medium">Apple Silicon (M-series)</div>
							<div className="text-xs text-muted-foreground">
								For Macs with M1, M2, M3, or M4 chip
							</div>
						</div>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function WindowsDownloadButton({ isPrimary = false }: { isPrimary?: boolean }) {
	const buttonVariant = isPrimary ? "default" : "outline";
	return (
		<Button variant={buttonVariant} size="lg" asChild>
			<a
				href={platformConfigs.windows.downloadUrl || "#"}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-2"
			>
				<PlatformIcon src="/images/icons/windows.svg" alt="Windows" />
				Download for Windows
			</a>
		</Button>
	);
}

function LinuxDownloadButton({ isPrimary = false }: { isPrimary?: boolean }) {
	const buttonVariant = isPrimary ? "default" : "outline";
	return (
		<Button variant={buttonVariant} size="lg" asChild>
			<a
				href={platformConfigs.linux.downloadUrl || "#"}
				target="_blank"
				rel="noopener noreferrer"
				className="flex items-center gap-2"
			>
				<PlatformIcon src="/images/icons/linux.svg" alt="Linux" />
				Download for Linux
			</a>
		</Button>
	);
}

function DesktopSection() {
	const { isMac, isWindows, isLinux } = usePlatformDetection();

	const renderPrimaryButton = () => {
		if (isMac) return <MacDownloadButton isPrimary />;
		if (isWindows) return <WindowsDownloadButton isPrimary />;
		if (isLinux) return <LinuxDownloadButton isPrimary />;
		return <MacDownloadButton isPrimary />;
	};

	return (
		<DownloadSectionLayout
			webpSrc="/images/screenshots/desktop_dock.webp"
			pngSrc="/images/screenshots/desktop_dock.png"
			imageAlt={`${APP_CONFIG.name} Desktop App`}
			imagePosition="left"
			contentAlignment="right"
			title="Download for Desktop"
			description="Get the native desktop experience with enhanced performance."
			actions={
				<div className="flex flex-col gap-3">
					{renderPrimaryButton()}
					<div className="flex flex-wrap justify-center gap-2 md:justify-end">
						{!isMac && <MacDownloadButton />}
						{!isWindows && (
							<Button variant="outline" size="sm" asChild>
								<a
									href={platformConfigs.windows.downloadUrl || "#"}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-2"
								>
									<PlatformIcon
										src="/images/icons/windows.svg"
										alt="Windows"
										className="h-4 w-4"
									/>
									Windows
								</a>
							</Button>
						)}
						{!isLinux && (
							<Button variant="outline" size="sm" asChild>
								<a
									href={platformConfigs.linux.downloadUrl || "#"}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-2"
								>
									<PlatformIcon
										src="/images/icons/linux.svg"
										alt="Linux"
										className="h-4 w-4"
									/>
									Linux
								</a>
							</Button>
						)}
					</div>
				</div>
			}
			extraContent={
				<div className="flex items-center gap-4 text-sm text-muted-foreground">
					<a
						href={GITHUB_RELEASES_BASE}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 transition-colors hover:text-foreground"
					>
						All releases
						<ArrowRight className="h-4 w-4" />
					</a>
				</div>
			}
		/>
	);
}

function MobileSection() {
	return (
		<DownloadSectionLayout
			webpSrc="/images/screenshots/phone_dock.webp"
			pngSrc="/images/screenshots/phone_dock.png"
			imageAlt={`${APP_CONFIG.name} Mobile App`}
			imagePosition="right"
			imageClassName="object-cover object-center"
			contentAlignment="left"
			chip={<Badge variant="secondary">Coming Soon</Badge>}
			title="Mobile Apps"
			description={`${APP_CONFIG.name} for iOS and Android is currently in development.`}
			actions={
				<div className="flex gap-2">
					<Button variant="outline" disabled>
						<PlatformIcon src="/images/icons/apple.svg" alt="iOS" />
						App Store
					</Button>
					<Button variant="outline" disabled>
						<PlatformIcon src="/images/icons/google_play.svg" alt="Android" />
						Google Play
					</Button>
				</div>
			}
		/>
	);
}

function WebSection() {
	return (
		<DownloadSectionLayout
			webpSrc="/images/screenshots/website_tab.webp"
			pngSrc="/images/screenshots/website_tab.png"
			imageAlt={`${APP_CONFIG.name} Web App`}
			imagePosition="left"
			imageClassName="object-cover object-top"
			contentAlignment="right"
			title="Get Started on the Web"
			description="No download required. Access directly from your browser."
			actions={
				<Button asChild size="lg">
					<Link to="/login">Get Started Free</Link>
				</Button>
			}
		/>
	);
}

function DownloadPage() {
	return (
		<div className="w-full min-h-screen bg-background text-foreground flex flex-col items-center">
			{/* Hero */}
			<section className="flex w-full max-w-5xl mx-auto flex-col items-center gap-4 px-6 pb-8 pt-24 sm:pt-32">
				<h1 className="text-foreground text-center text-4xl font-semibold sm:text-5xl">
					Download {APP_CONFIG.name}
				</h1>
				<p className="text-muted-foreground max-w-xl text-center text-lg">
					Available on all your devices. Choose your platform below.
				</p>
			</section>

			<DesktopSection />
			<MobileSection />
			<WebSection />

			{/* Footer */}
			<div className="pb-16 text-center">
				<p className="text-muted-foreground text-sm">
					&copy; {new Date().getFullYear()} {APP_CONFIG.name}. All rights
					reserved.
				</p>
			</div>
		</div>
	);
}
