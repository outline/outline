import * as React from "react";

type Props = {
  size?: number;
  fill?: string;
};

export default function Icon({ size = 24 }: Props) {
  const imageSize = Math.round(size * 0.75);

  return (
    <span
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src="/images/grist.png"
        alt="Grist"
        width={imageSize}
        height={imageSize}
        style={{ borderRadius: 2, display: "block" }}
      />
    </span>
  );
}
