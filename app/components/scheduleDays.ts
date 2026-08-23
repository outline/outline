import type {
  CalendarDay,
  CalendarEvent,
} from "~/components/CalendarsMonthView";
/** A room's occupancy across days. */
interface OccupancyRow {
  roomId: string;
  roomName: string;
  capacity: number;
  days: {
    date: string;
    occupied: number;
    isClosed: boolean;
    guests: {
      boardingId: string;
      petName: string;
      customerName: string;
    }[];
  }[];
}
/** A groomer's appointments across days. */
interface GroomingRow {
  groomerId: string;
  groomerName: string;
  days: {
    date: string;
    isClosed: boolean;
    appointments: {
      id: string;
      petName: string;
      customerName: string;
      service: string;
      status: string;
    }[];
  }[];
}
/** The day part of an ISO timestamp. */
const dayKey = (iso: string) => iso.slice(0, 10);
/**
 * Collapses per-row grids into the month grid the calendar draws.
 *
 * The mock answers with a row per room or groomer; the calendar wants a row
 * per day with everything happening on it, so the two are transposed here
 * rather than in either of them.
 *
 * @param dates every day the grid covers, in order.
 * @param eventsByDay the events falling on each day.
 * @returns the days, marked up for the calendar.
 */
function toDays(
  dates: string[],
  eventsByDay: Map<string, CalendarEvent[]>
): CalendarDay[] {
  const today = new Date().toISOString().slice(0, 10);
  const month = dates[0]?.slice(0, 7);
  return dates.map((date) => ({
    date,
    isCurrentMonth: date.slice(0, 7) === month,
    isToday: date === today,
    events: eventsByDay.get(date) ?? [],
  }));
}
/**
 * Boarding stays as calendar days.
 *
 * @param rows the occupancy grid.
 * @returns days for the calendar.
 */
export function boardingsToCalendar(rows: OccupancyRow[]): CalendarDay[] {
  const dates = rows[0]?.days.map((day) => dayKey(day.date)) ?? [];
  const byDay = new Map<string, CalendarEvent[]>();
  rows.forEach((row) => {
    row.days.forEach((day) => {
      const key = dayKey(day.date);
      const events = byDay.get(key) ?? [];
      day.guests.forEach((guest) => {
        events.push({
          id: `${guest.boardingId}-${key}`,
          name: guest.petName,
          // The cell is narrow; the room and owner go in the hover text.
          time: "",
          detail: `${guest.petName} · ${guest.customerName} · ${row.roomName}`,
          datetime: day.date,
          href: `/boardings/${guest.boardingId}`,
        });
      });
      if (day.isClosed && events.length === 0) {
        events.push({
          id: `closed-${row.roomId}-${key}`,
          name: "Closed",
          time: "",
          datetime: day.date,
          href: "#",
        });
      }
      byDay.set(key, events);
    });
  });
  return toDays(dates, byDay);
}
/**
 * Grooming appointments as calendar days.
 *
 * @param rows the grooming grid.
 * @returns days for the calendar.
 */
export function groomingToCalendar(rows: GroomingRow[]): CalendarDay[] {
  const dates = rows[0]?.days.map((day) => dayKey(day.date)) ?? [];
  const byDay = new Map<string, CalendarEvent[]>();
  rows.forEach((row) => {
    row.days.forEach((day) => {
      const key = dayKey(day.date);
      const events = byDay.get(key) ?? [];
      day.appointments.forEach((appointment) => {
        events.push({
          id: appointment.id,
          name: appointment.petName,
          time: "",
          detail: `${appointment.service} · ${appointment.petName} · ${row.groomerName}`,
          datetime: day.date,
          href: "#",
        });
      });
      byDay.set(key, events);
    });
  });
  return toDays(dates, byDay);
}
