import isPropValid from "@emotion/is-prop-valid";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheetManager, type WebTarget } from "styled-components";

interface Props {
  /** The content to render. */
  children: ReactNode;
  /** An optional sheet to collect styles into, used for server rendering. */
  sheet?: ComponentProps<typeof StyleSheetManager>["sheet"];
}

/**
 * Configures styled-components for a React tree. Only valid HTML attributes
 * are forwarded to DOM elements, and vendor prefixes are added to CSS.
 *
 * @param props the component props.
 * @returns the children wrapped in a configured StyleSheetManager.
 */
export function StyleSheetProvider({ children, sheet }: Props) {
  return (
    <StyleSheetManager
      sheet={sheet}
      shouldForwardProp={shouldForwardProp}
      enableVendorPrefixes
    >
      {children}
    </StyleSheetManager>
  );
}

function shouldForwardProp(prop: string, target: WebTarget) {
  return typeof target === "string" ? isPropValid(prop) : true;
}
