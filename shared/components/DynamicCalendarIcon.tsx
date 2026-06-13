import { useTheme } from "styled-components";

type Props = { day?: number; className?: string };

export function DynamicCalendarIcon({ day, className }: Props) {
  const theme = useTheme();

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      // Decorative icon: hide from assistive tech so the day digit isn't
      // announced out of context.
      aria-hidden
      focusable={false}
      // Isolate so the day text only blends against the icon's own fill below
      // it, not whatever is behind the icon on the page.
      style={{ isolation: "isolate" }}
    >
      <path
        d="M10 5.01953C10.3319 5.00624 10.6846 5 11.0596 5H12.9404C13.3154 5 13.6681 5.00624 14 5.01953V4H16V5.24609C18.3996 5.78241 19 7.32118 19 11.0596V12.9404C19 17.9302 17.9302 19 12.9404 19H11.0596C6.06982 19 5 17.9302 5 12.9404V11.0596C5 7.32118 5.60035 5.78241 8 5.24609V4H10V5.01953Z"
        fill="currentColor"
      />
      <text
        // White blended with "difference" against the fill below produces the
        // exact inverse of the fill colour, so the day is always legible
        // regardless of the icon's (currentColor) fill.
        fill="white"
        style={{ mixBlendMode: "difference" }}
        fontFamily={theme.fontFamily}
        fontSize="8"
        fontWeight="600"
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing="0em"
      >
        <tspan x="12" y="13.5">
          {day}
        </tspan>
      </text>
    </svg>
  );
}
