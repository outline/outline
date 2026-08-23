import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GroomerCalendar } from "@/domain/grooming/components/GroomerCalendar";

export const Route = createFileRoute("/_authenticated/grooming/")({
	component: GroomingIndex,
});

function GroomingIndex() {
	const [_currentDate, _setCurrentDate] = useState(new Date());

	return <GroomerCalendar />;
}
