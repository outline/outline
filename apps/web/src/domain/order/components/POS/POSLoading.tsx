import { Skeleton } from "@/components/ui/skeleton";

export function POSLoading() {
	return (
		<div className="flex h-full font-inter bg-white">
			<div className="flex-1 flex flex-col h-full border-r border-neutral-200/80">
				<div className="p-6 pb-4 border-b border-neutral-200/80 bg-white">
					<div className="flex justify-between mb-4">
						<Skeleton className="h-8 w-40 rounded-md" />
						<Skeleton className="h-6 w-24 rounded-md" />
					</div>
					<Skeleton className="h-11 w-full rounded-lg" />
				</div>
				<div className="flex-1 p-6">
					<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
						{[1, 2, 3, 4, 5, 6].map((i) => (
							<Skeleton key={i} className="h-40 rounded-lg" />
						))}
					</div>
				</div>
			</div>
			<div className="w-[380px] bg-white h-full flex flex-col p-6">
				<Skeleton className="h-8 w-32 mb-6 rounded-md" />
				<div className="flex-1 space-y-4">
					{[1, 2].map((i) => (
						<Skeleton key={i} className="h-20 w-full rounded-lg" />
					))}
				</div>
				<div className="mt-auto space-y-4 pt-6 border-t border-neutral-100">
					<Skeleton className="h-10 w-full rounded-lg" />
					<Skeleton className="h-14 w-full rounded-lg" />
				</div>
			</div>
		</div>
	);
}
