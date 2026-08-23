import { Link } from "@tanstack/react-router";
import { CloseCircleLinear as CloseIcon } from "solar-icon-set";
import { AppVersionInfo } from "@/components/layout/AppVersionInfo";
import { Button } from "@/components/ui/button";
import { ClockInOutWidget } from "@/domain/shift/components/ClockInOutWidget";
import { cn } from "@/shared/utils";

export type TSidebarItem = {
	to: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	iconActive?: React.ComponentType<{ className?: string }>;
};

export type TAuthSidebarProps = {
	readonly items: readonly TSidebarItem[];
	readonly currentPath: string;
	readonly showPromo: boolean;
	readonly setShowPromo: (val: boolean) => void;
	readonly appVersion: string;
	readonly buildNumber: string;
	readonly commitHash: string;
};

export const AuthSidebar = ({
	items,
	currentPath,
	showPromo,
	setShowPromo,
	appVersion,
	buildNumber,
	commitHash,
}: TAuthSidebarProps) => {
	return (
		<aside className="w-full md:w-[220px] flex-shrink-0 border-r border-neutral-200/50 bg-[#F5F5F5] p-2 pt-2 hidden md:flex flex-col gap-0.5 overflow-y-auto">
			<div className="flex-1 space-y-0.5 mt-2">
				{items.map((item) => {
					const active =
						currentPath === item.to ||
						(currentPath === "/_authenticated" && item.to === "/dashboard");
					const Icon = active && item.iconActive ? item.iconActive : item.icon;
					return (
						<Link
							key={item.label}
							to={item.to as string}
							className={cn(
								"flex items-center gap-2.5 px-2.5 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors",
								active
									? "bg-white text-neutral-900 shadow-sm border border-neutral-200/60"
									: "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50",
							)}
						>
							<Icon
								className={cn(
									"w-[16px] h-[16px]",
									active ? "text-neutral-900" : "text-neutral-500",
								)}
							/>
							{item.label}
						</Link>
					);
				})}
			</div>

			<div className="mt-auto space-y-2 pt-4 border-t border-neutral-100/50">
				{showPromo && (
					<div className="relative group mx-1">
						<div className="bg-white rounded-lg overflow-hidden border border-neutral-200 transition-all hover:border-neutral-300 flex flex-col">
							{/* Section 1: Title + Close */}
							<div className="px-3 py-2 flex items-center justify-between border-b border-neutral-100 bg-neutral-50/30">
								<span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
									Announcement
								</span>
								<button
									type="button"
									onClick={() => setShowPromo(false)}
									className="text-neutral-400 hover:text-neutral-900 transition-colors"
								>
									<CloseIcon className="w-3.5 h-3.5" />
								</button>
							</div>

							{/* Section 2: Image/Visual */}
							<div className="h-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-rose-50 relative overflow-hidden">
								<div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="text-neutral-900 font-black text-2xl tracking-tighter opacity-10 select-none uppercase italic">
										Universe '26
									</div>
								</div>
							</div>

							{/* Section 3: Description */}
							<div className="p-3 pt-3">
								<div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5">
									<span className="w-1 h-1 rounded-full bg-indigo-500" />
									Oct 28-29 • San Francisco, CA
								</div>
								<p className="text-[11px] font-bold text-neutral-900 leading-snug">
									Save $600 with Super Early Bird passes through July 8.
								</p>
							</div>

							{/* Section 4: Action */}
							<div className="px-3 pb-3">
								<Button
									size="sm"
									variant="secondary"
									className="w-full h-8 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 border-none text-[11px] font-bold"
								>
									Register now
								</Button>
							</div>
						</div>
					</div>
				)}

				<ClockInOutWidget />

				<AppVersionInfo
					appVersion={appVersion}
					buildNumber={buildNumber}
					commitHash={commitHash}
				/>
			</div>
		</aside>
	);
};
