import { Link } from "@tanstack/react-router";
import { cn } from "@/shared/utils";

export type TMobileNavItem = {
	readonly to: string;
	readonly label: string;
	readonly icon: React.ComponentType<{ className?: string }>;
	readonly activePaths?: string[];
};

export type TMobileNavProps = {
	readonly items: readonly TMobileNavItem[];
	readonly currentPath: string;
};

export const MobileNav = ({ items, currentPath }: TMobileNavProps) => {
	return (
		<nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-neutral-200 px-6 flex items-center justify-between z-50">
			{items.map((item) => {
				const active =
					item.activePaths?.some((p) => currentPath.startsWith(p)) ||
					(currentPath.startsWith(item.to) && item.to !== "/dashboard") ||
					((currentPath === "/_authenticated" ||
						currentPath === "/dashboard") &&
						item.to === "/dashboard");
				return (
					<Link
						key={item.to}
						to={item.to as string}
						className={cn(
							"flex flex-col items-center gap-1 transition-colors",
							active ? "text-neutral-900" : "text-neutral-400",
						)}
					>
						<item.icon
							className={cn("w-5 h-5", active ? "text-mint-green" : "")}
						/>
						<span className="text-[10px] font-bold uppercase tracking-widest">
							{item.label}
						</span>
					</Link>
				);
			})}
		</nav>
	);
};
