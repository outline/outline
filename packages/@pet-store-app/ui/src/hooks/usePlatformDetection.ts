import { useEffect, useState } from "react";

export type Platform =
	| "mac-arm"
	| "mac-intel"
	| "windows"
	| "linux"
	| "ios"
	| "android"
	| "unknown";

export interface PlatformInfo {
	platform: Platform;
	displayName: string;
	shortName: string;
	iconPath: string;
	downloadUrl: string | null;
	isDesktop: boolean;
	isMobile: boolean;
}

const GITHUB_RELEASES_BASE =
	"https://github.com/theexperiencecompany/gaia/releases/latest";

const platformConfigs: Record<Platform, Omit<PlatformInfo, "platform">> = {
	"mac-arm": {
		displayName: "macOS (Apple Silicon)",
		shortName: "Mac (M-series)",
		iconPath: "/images/icons/apple.svg",
		downloadUrl: `${GITHUB_RELEASES_BASE}/download/GAIA-arm64.dmg`,
		isDesktop: true,
		isMobile: false,
	},
	"mac-intel": {
		displayName: "macOS (Intel)",
		shortName: "Mac (Intel)",
		iconPath: "/images/icons/apple.svg",
		downloadUrl: `${GITHUB_RELEASES_BASE}/download/GAIA-x64.dmg`,
		isDesktop: true,
		isMobile: false,
	},
	windows: {
		displayName: "Windows",
		shortName: "Windows",
		iconPath: "/images/icons/windows.svg",
		downloadUrl: `${GITHUB_RELEASES_BASE}/download/GAIA-x64.exe`,
		isDesktop: true,
		isMobile: false,
	},
	linux: {
		displayName: "Linux",
		shortName: "Linux",
		iconPath: "/images/icons/linux.svg",
		downloadUrl: `${GITHUB_RELEASES_BASE}/download/GAIA-x64.AppImage`,
		isDesktop: true,
		isMobile: false,
	},
	ios: {
		displayName: "iOS",
		shortName: "iPhone & iPad",
		iconPath: "/images/icons/apple.svg",
		downloadUrl: null, // Coming soon
		isDesktop: false,
		isMobile: true,
	},
	android: {
		displayName: "Android",
		shortName: "Android",
		iconPath: "/images/icons/google_play.svg",
		downloadUrl: null, // Coming soon
		isDesktop: false,
		isMobile: true,
	},
	unknown: {
		displayName: "Desktop",
		shortName: "Desktop",
		iconPath: "/images/icons/apple.svg",
		downloadUrl: GITHUB_RELEASES_BASE,
		isDesktop: true,
		isMobile: false,
	},
};

function detectPlatform(): Platform {
	if (typeof window === "undefined" || typeof navigator === "undefined") {
		return "unknown";
	}

	const userAgent = navigator.userAgent.toLowerCase();
	const platform = navigator.platform?.toLowerCase() || "";

	// Detect iOS
	if (/iphone|ipad|ipod/.test(userAgent)) {
		return "ios";
	}

	// Detect Android
	if (/android/.test(userAgent)) {
		return "android";
	}

	// Detect macOS
	if (platform.includes("mac") || /macintosh|mac os x/.test(userAgent)) {
		const isArmMac =
			((navigator as Navigator & { userAgentData?: { platform?: string } })
				.userAgentData?.platform === "macOS" &&
				/arm|aarch64/.test(userAgent)) ||
			(window.devicePixelRatio >= 2 && window.screen.width >= 1280);

		return isArmMac ? "mac-arm" : "mac-intel";
	}

	// Detect Windows
	if (platform.includes("win") || /windows/.test(userAgent)) {
		return "windows";
	}

	// Detect Linux
	if (platform.includes("linux") || /linux/.test(userAgent)) {
		return "linux";
	}

	return "unknown";
}

export function usePlatformDetection() {
	const [platform, setPlatform] = useState<Platform>("unknown");
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		setPlatform(detectPlatform());
		setIsLoading(false);
	}, []);

	const currentPlatform: PlatformInfo = {
		platform,
		...platformConfigs[platform],
	};

	const allPlatforms: PlatformInfo[] = Object.entries(platformConfigs)
		.filter(([key]) => key !== "unknown")
		.map(([key, config]) => ({
			platform: key as Platform,
			...config,
		}));

	const desktopPlatforms = allPlatforms.filter((p) => p.isDesktop);
	const mobilePlatforms = allPlatforms.filter((p) => p.isMobile);

	// Get platforms sorted with current platform first (for desktop)
	const sortedDesktopPlatforms = [
		...desktopPlatforms.filter((p) => p.platform === platform),
		...desktopPlatforms.filter((p) => p.platform !== platform),
	];

	return {
		platform,
		currentPlatform,
		allPlatforms,
		desktopPlatforms,
		mobilePlatforms,
		sortedDesktopPlatforms,
		isLoading,
		isMac: platform === "mac-arm" || platform === "mac-intel",
		isWindows: platform === "windows",
		isLinux: platform === "linux",
		isMobile: platform === "ios" || platform === "android",
	};
}

export { GITHUB_RELEASES_BASE, platformConfigs };
