import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";
import { useTheme } from "styled-components";

function PlantUmlDiagrams({ matches, ...props }: Props) {
  const theme = useTheme();
  const mode = theme.isDark ? "dsvg" : "svg";
  const title = props.attrs.href.split("/uml/")[1];
  const finalUrl = `https://www.plantuml.com/plantuml/${mode}/${title}`;

  return (
    <Frame
      {...props}
      src={finalUrl}
      icon={
        <Image
          src="/images/plantuml.png"
          alt="PlantUml"
          width={16}
          height={16}
        />
      }
      canonicalUrl={props.attrs.href}
      border
    />
  );
}

export default PlantUmlDiagrams;
