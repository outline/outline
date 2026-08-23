import type { Meta, StoryObj } from "@storybook/react";
import { CalendarsBorderlessSideBySide } from "~/components/CalendarsBorderlessSideBySide";
import { CalendarsBorderlessStacked } from "~/components/CalendarsBorderlessStacked";
import { CalendarsDayView } from "~/components/CalendarsDayView";
import { CalendarsDouble } from "~/components/CalendarsDouble";
import { CalendarsMonthView } from "~/components/CalendarsMonthView";
import { CalendarsSmallWithMeetings } from "~/components/CalendarsSmallWithMeetings";
import { CalendarsWeekView } from "~/components/CalendarsWeekView";
import { CalendarsYearView } from "~/components/CalendarsYearView";
const meta: Meta = {
  title: "Application UI/Data Display/Calendars",
};
export default meta;
export const BorderlessSideBySide: StoryObj = {
  render: () => <CalendarsBorderlessSideBySide />,
};
export const BorderlessStacked: StoryObj = {
  render: () => <CalendarsBorderlessStacked />,
};
export const DayView: StoryObj = {
  render: () => <CalendarsDayView />,
};
export const Double: StoryObj = {
  render: () => <CalendarsDouble />,
};
export const MonthView: StoryObj = {
  render: () => <CalendarsMonthView />,
};
export const SmallWithMeetings: StoryObj = {
  render: () => <CalendarsSmallWithMeetings />,
};
export const WeekView: StoryObj = {
  render: () => <CalendarsWeekView />,
};
export const YearView: StoryObj = {
  render: () => <CalendarsYearView />,
};
