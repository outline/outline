import * as React from "react";
import { useTheme } from "styled-components";
import Frame from "../components/Frame";
import type { EmbedProps as Props } from ".";

function JSFiddle({ matches, ...props }: Props) {
  const normalizedUrl = props.attrs.href.replace(/(\/embedded)?\/$/, "");
  const theme = useTheme();

  return (
    <Frame
      {...props}
      src={`${normalizedUrl}/embedded/result,js,css,html/${
        theme.isDark ? "dark/" : ""
      }`}
      title="JSFiddle Embed"
      referrerPolicy="strict-origin-when-cross-origin"
      border
    />
  );
}

export default JSFiddle;
