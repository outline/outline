import { useCopyToClipboard } from "@/shared/hooks/use-copy-to-clipboard";
import { cn } from "@/shared/utils";

export type TAppVersionInfoProps = {
	readonly appVersion: string;
	readonly buildNumber: string;
	readonly commitHash: string;
	readonly className?: string;
};

export const AppVersionInfo = ({
	appVersion,
	buildNumber,
	commitHash,
	className,
}: TAppVersionInfoProps) => {
	const copy = useCopyToClipboard();

	const handleCopy = () => {
		copy(
			`Versi Aplikasi - ${appVersion}\nVersi Bundle - ${buildNumber} (${commitHash})`,
			"Info versi disalin",
		);
	};

	return (
		<button
			type="button"
			onClick={handleCopy}
			title="Klik untuk salin info versi"
			className={cn(
				"w-full text-left px-3 pb-2 text-[10px] leading-relaxed transition-colors hover:text-neutral-600",
				className,
			)}
		>
			<div className="font-bold text-neutral-500">
				Versi Aplikasi - {appVersion}
			</div>
			<div className="text-neutral-400">
				Versi Bundle - {buildNumber} ({commitHash})
			</div>
		</button>
	);
};
