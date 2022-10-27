import * as React from "react";

type Options = {
  fontSize?: string;
  lineHeight?: string;
};

/**
 * Measures the width of an emoji character
 */
export default function useEmojiWidth(
  emoji: string | null | undefined,
  { fontSize = "2.25em", lineHeight = "1.25" }: Options
) {
  return React.useMemo(() => {
    const element = window.document.createElement("span");
    if (!emoji) {
      return 0;
    }

    element.innerText = `${emoji}\u00A0`;
    element.style.visibility = "hidden";
    element.style.position = "absolute";
    element.style.left = "-9999px";
    element.style.lineHeight = lineHeight;
    element.style.fontSize = fontSize;
    element.style.width = "max-content";
    window.document.body?.appendChild(element);
    const width = window.getComputedStyle(element).width;
    window.document.body?.removeChild(element);
    return parseInt(width, 10);
  }, [emoji, fontSize, lineHeight]);
}
