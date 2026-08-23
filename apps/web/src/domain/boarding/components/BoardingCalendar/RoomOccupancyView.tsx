import { useQuery } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";
import { BedLinear as RoomIcon } from "solar-icon-set";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getBoardings } from "@/lib/api/boardings.functions";
import { getRooms } from "@/lib/api/room.functions";
import { EmptyState, ErrorState } from "@/ui";

export function RoomOccupancyView() {
	const { t } = useTranslation();
	const today = startOfDay(new Date());

	const {
		data: rooms = [],
		isLoading: loadingRooms,
		isError: errorRooms,
	} = useQuery({
		queryKey: ["rooms"],
		queryFn: () => getRooms(),
	});

	const {
		data: boardings = [],
		isLoading: loadingBoardings,
		isError: errorBoardings,
	} = useQuery({
		queryKey: ["boardings"],
		queryFn: () => getBoardings(),
	});

	if (errorRooms || errorBoardings) {
		return <ErrorState error={new Error(t("common.error"))} />;
	}

	if (loadingRooms || loadingBoardings) {
		return (
			<div className="space-y-4 p-6">
				<Skeleton className="h-24 w-full rounded-xl" />
				<Skeleton className="h-24 w-full rounded-xl" />
				<Skeleton className="h-24 w-full rounded-xl" />
			</div>
		);
	}

	if (rooms.length === 0) {
		return (
			<div className="p-12">
				<EmptyState
					icon={RoomIcon}
					title={t("boarding.no_room_title")}
					description={t("boarding.no_room_desc")}
				/>
			</div>
		);
	}

	// Calculate occupancy
	const occupancyData = rooms.map((room) => {
		// Find active boardings for this room today
		const activeBoardings = boardings.filter((b) => {
			if (b.status !== "active" && b.status !== "draft") return false;
			if (b.roomId !== room.id) return false;

			const checkIn = startOfDay(new Date(b.checkInDate));
			const checkOut = b.estimatedCheckOutDate
				? startOfDay(new Date(b.estimatedCheckOutDate))
				: checkIn;

			return today >= checkIn && today <= checkOut;
		});

		const currentOccupancy = activeBoardings.reduce(
			(sum, b) => sum + (b.pets?.length || 1),
			0,
		);
		const isFull = currentOccupancy >= room.capacity;

		return {
			...room,
			currentOccupancy,
			isFull,
			activeBoardings,
		};
	});

	const totalRooms = rooms.length;
	const occupiedRooms = occupancyData.filter(
		(r) => r.currentOccupancy > 0,
	).length;
	const occupancyRate =
		totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

	return (
		<div className="space-y-6">
			{/* Summary stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-sm">
					<div className="text-sm text-neutral-500 font-medium mb-1">
						{t("boarding.occupancy_title")}
					</div>
					<div className="text-3xl font-bold text-neutral-900">
						{occupancyRate}%
					</div>
					<div className="text-xs text-neutral-500 mt-1">
						{occupiedRooms} {t("common.of")} {totalRooms}{" "}
						{t("nav.rooms").toLowerCase()} {t("common.filled")}
					</div>
				</div>
				<div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-sm">
					<div className="text-sm text-neutral-500 font-medium mb-1">
						{t("boarding.rooms_available")}
					</div>
					<div className="text-3xl font-bold text-emerald-600">
						{totalRooms - occupiedRooms}
					</div>
					<div className="text-xs text-neutral-500 mt-1">
						{t("common.ready_to_use", "Siap digunakan")}
					</div>
				</div>
				<div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-sm">
					<div className="text-sm text-neutral-500 font-medium mb-1">
						{t("boarding.total_guests")}
					</div>
					<div className="text-3xl font-bold text-blue-600">
						{occupancyData.reduce((sum, r) => sum + r.currentOccupancy, 0)}
					</div>
					<div className="text-xs text-neutral-500 mt-1">
						{t("common.staying", "Sedang menginap")}
					</div>
				</div>
			</div>

			<h3 className="font-semibold text-lg">
				{t("boarding.room_status_header")}
			</h3>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{occupancyData.map((room) => (
					<div
						key={room.id}
						className={`p-5 rounded-xl border relative overflow-hidden transition-all ${
							room.isFull
								? "bg-red-50/50 border-red-200"
								: room.currentOccupancy > 0
									? "bg-orange-50/50 border-orange-200"
									: "bg-white border-neutral-200"
						}`}
					>
						<div className="flex justify-between items-start mb-4">
							<div>
								<h4 className="font-bold text-neutral-900 text-lg">
									{room.name}
								</h4>
								<span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
									{room.roomType}
								</span>
							</div>
							{room.isFull ? (
								<Badge
									variant="destructive"
									className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 uppercase"
								>
									{t("boarding.full_badge")}
								</Badge>
							) : room.currentOccupancy > 0 ? (
								<Badge
									variant="outline"
									className="bg-orange-100 text-orange-700 border-orange-200 uppercase text-[10px]"
								>
									{t("boarding.partially_filled_badge")}
								</Badge>
							) : (
								<Badge
									variant="outline"
									className="bg-emerald-100 text-emerald-700 border-emerald-200 uppercase"
								>
									{t("boarding.available_badge")}
								</Badge>
							)}
						</div>

						<div className="flex items-center gap-2 text-sm text-neutral-600 mb-4">
							<RoomIcon className="w-4 h-4" />
							<span>
								{t("boarding.capacity_label")}:{" "}
								<strong className={room.isFull ? "text-red-600" : ""}>
									{room.currentOccupancy}
								</strong>{" "}
								/ {room.capacity} {t("common.unit_qty", "ekor")}
							</span>
						</div>

						{room.activeBoardings.length > 0 && (
							<div className="space-y-2 mt-4 pt-4 border-t border-black/5">
								<div className="text-xs font-semibold text-neutral-500">
									{t("boarding.current_guests_label")}:
								</div>
								{room.activeBoardings.map((b) => (
									<div
										key={b.id}
										className="text-sm bg-white rounded p-2 border shadow-sm flex justify-between items-center"
									>
										<div className="truncate font-medium">{b.ownerName}</div>
										<div className="text-xs text-neutral-500">
											{b.pets?.length || 1} {t("common.unit_qty", "ekor")}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
