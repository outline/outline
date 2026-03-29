type Props = {
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the current text color */
  color?: string;
  /** If true, the icon will retain its color in selected menus and other places that attempt to override it */
  retainColor?: boolean;
};

export default function CircleIcon({
  size = 24,
  color = "currentColor",
  retainColor,
  ...rest
}: Props) {
  const isGradient = color === "rainbow";
  const fillValue = isGradient ? "url(#circleIconGradient)" : color;

  return (
    <svg
      fill={fillValue}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      version="1.1"
      style={retainColor ? { fill: fillValue } : undefined}
      {...rest}
    >
      {isGradient && (
        <defs>
          <linearGradient
            id="circleIconGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#ff5858" />
            <stop offset="50%" stopColor="#fbcc34" />
            <stop offset="100%" stopColor="#00c6ff" />
          </linearGradient>
        </defs>
      )}
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}
