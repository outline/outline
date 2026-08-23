import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { addDays, endOfDay, format, startOfDay, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { useState } from "react";
import {
	AltArrowLeftLinear,
	AltArrowRightLinear,
	CalendarLinear as CalendarIcon,
} from "solar-icon-set";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GroomingAppointmentDetail } from "./GroomingAppointmentDetail";
import { getGroomingCalendar } from "@/lib/api/grooming.functions";
import { getStaffMembers } from "@/lib/api/staff.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { cn } from "@/shared/utils";

const TIME_SLOTS = [
	"09:00",
	"10:00",
	"11:00",
	"12:00",
	"13:00",
	"14:00",
	"15:00",
	"16:00",
	"17:00",
];

export function GroomerCalendar() {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [selectedAppointmentId, setSelectedAppointmentId] = useState<
		string | null
	>(null);

	const getGroomingCalendarFn = useServerFn(getGroomingCalendar);
	const getStaffMembersFn = useServerFn(getStaffMembers);

	const { data: staffMembers = [] } = useQuery({
		queryKey: ["staffMembers"],
		queryFn: () => getStaffMembersFn(),
	});

	// Filter staff to only show groomers (assuming 'staff_daycare' or maybe we just show all staff that can groom)
	// For now, let's just show all staff members as groomers
	const groomers = staffMembers.map((s) => ({
		id: s.userId,
		name: s.fullName || s.email,
		avatar: (s.fullName || s.email || "?").charAt(0).toUpperCase(),
	}));

	const { data: calendarData = [], isLoading } = useQuery({
		queryKey: queryKeys.grooming.calendar({
			date: format(currentDate, "yyyy-MM-dd"),
		}),
		staleTime: QUERY_POLICY.operational.staleTime,
		gcTime: QUERY_POLICY.operational.gcTime,
		queryFn: () =>
			getGroomingCalendarFn({
				data: {
					start: startOfDay(currentDate),
					end: endOfDay(currentDate),
				},
			}),
	});

	const handlePrevDay = () => setCurrentDate((prev) => subDays(prev, 1));
	const handleNextDay = () => setCurrentDate((prev) => addDays(prev, 1));
	const handleToday = () => setCurrentDate(new Date());

	return (
		<div className="flex flex-col h-[calc(100vh-16rem)] min-h-[600px] border border-neutral-200/60 rounded-xl overflow-hidden bg-white shadow-sm">
			{/* Calendar Header */}
			<div className="flex items-center justify-between p-4 border-b border-neutral-200/60 bg-neutral-50/50">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-lg shadow-sm overflow-hidden">
						<button
							onClick={handlePrevDay}
							className="p-2 hover:bg-neutral-50 text-neutral-600 transition-colors"
						>
							<AltArrowLeftLinear className="w-5 h-5" />
						</button>
						<div className="w-[1px] h-6 bg-neutral-200" />
						<button
							onClick={handleToday}
							className="px-4 py-2 text-sm font-medium hover:bg-neutral-50 text-neutral-700 transition-colors"
						>
							Hari Ini
						</button>
						<div className="w-[1px] h-6 bg-neutral-200" />
						<button
							onClick={handleNextDay}
							className="p-2 hover:bg-neutral-50 text-neutral-600 transition-colors"
						>
							<AltArrowRightLinear className="w-5 h-5" />
						</button>
					</div>
					<h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
						<CalendarIcon className="w-5 h-5 text-neutral-500" />
						{format(currentDate, "EEEE, d MMMM yyyy", { locale: id })}
					</h3>
				</div>
				<Button
					size="sm"
					className="bg-brand-solid hover:bg-brand-hover text-white"
				>
					+ Appointment
				</Button>
			</div>

			{/* Calendar Grid */}
			<div className="flex flex-1 overflow-auto">
				{/* Time Column */}
				<div className="w-20 border-r border-neutral-200/60 bg-neutral-50/30 flex-shrink-0">
					<div className="h-14 border-b border-neutral-200/60" />{" "}
					{/* Header spacer */}
					{TIME_SLOTS.map((time) => (
						<div
							key={time}
							className="h-24 border-b border-neutral-200/40 p-2 text-right"
						>
							<span className="text-xs font-bold text-neutral-400">{time}</span>
						</div>
					))}
				</div>

				{/* Groomer Columns */}
				<div className="flex flex-1 divide-x divide-neutral-200/60 min-w-max">
					{isLoading ? (
						<div className="flex-1 flex items-center justify-center text-neutral-500 p-8">
							Memuat data jadwal...
						</div>
					) : groomers.length === 0 ? (
						<div className="flex-1 flex items-center justify-center text-neutral-500 p-8">
							Belum ada staf / groomer.
						</div>
					) : (
						groomers.map((groomer) => {
							const groomerAppointments = calendarData.filter(
								(a) => a.groomerId === groomer.id,
							);

							return (
								<div key={groomer.id} className="flex-1 min-w-[250px] relative">
									{/* Groomer Header */}
									<div className="h-14 border-b border-neutral-200/60 bg-white sticky top-0 z-10 flex items-center justify-center gap-3 p-2">
										<Avatar className="w-8 h-8 shadow-sm text-xs">
											<AvatarImage src="" />
											<AvatarFallback seed={groomer.name || "User"}>
												{groomer.avatar}
											</AvatarFallback>
										</Avatar>
										<span className="font-bold text-neutral-700 text-sm">
											{groomer.name}
										</span>
									</div>

									{/* Slots */}
									<div className="relative">
										{TIME_SLOTS.map((time) => (
											<div
												key={time}
												className="h-24 border-b border-neutral-200/40 relative group"
											>
												<div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-brand-solid/5 transition-opacity cursor-pointer border-dashed border border-transparent group-hover:border-brand-solid/20 m-1 rounded-md flex items-center justify-center">
													<span className="text-xs font-bold text-brand-solid">
														+ Slot
													</span>
												</div>
											</div>
										))}

										{/* Render Appointments */}
										{groomerAppointments.map((appt) => {
											// Simple offset calculation
											const aptDate = new Date(appt.scheduledAt);
											const startHour = aptDate.getHours();
											const startMin = aptDate.getMinutes();
											const baseHour = 9; // 09:00 is our start

											const topOffset =
												(startHour - baseHour) * 96 + (startMin / 60) * 96;
											// Assuming 60 mins duration if unknown
											const durationMins = 60;
											const height = (durationMins / 60) * 96;

											return (
												<div
													key={appt.id}
													onClick={() => setSelectedAppointmentId(appt.id)}
													className={cn(
														"absolute left-2 right-2 rounded-lg p-3 text-xs border shadow-sm transition-transform hover:scale-[1.02] cursor-pointer z-20 overflow-hidden",
														appt.status === "in_progress" ||
															appt.status === "confirmed"
															? "bg-blue-50 border-blue-200 text-blue-900"
															: appt.status === "completed"
																? "bg-emerald-50 border-emerald-200 text-emerald-900"
																: "bg-neutral-50 border-neutral-200 text-neutral-900",
													)}
													style={{
														top: `${topOffset}px`,
														height: `${height}px`,
													}}
												>
													<div className="font-bold mb-1 truncate">
														{format(aptDate, "HH:mm")} •{" "}
														{((appt as Record<string, unknown>)
															.customerName as string) || "Unknown"}{" "}
														-{" "}
														{((appt as Record<string, unknown>)
															.petName as string) || "Unknown"}
													</div>
													<div className="truncate opacity-80">
														{((appt as Record<string, unknown>)
															.petName as string) || "No Pet"}
													</div>
													<div className="absolute left-0 top-0 bottom-0 w-1 bg-current opacity-20" />
												</div>
											);
										})}
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>
			<GroomingAppointmentDetail
				appointmentId={selectedAppointmentId}
				onClose={() => setSelectedAppointmentId(null)}
			/>
		</div>
	);
}
