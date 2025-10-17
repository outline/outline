import * as React from "react";
import Frame from "../components/Frame";
import Image from "../components/Img";
import { EmbedProps as Props } from ".";

function PlantUmlDiagrams({ matches, ...props }: Props) {
  const title = props.attrs.href.split("/uml/")[1];
  var finalUrl = "https://www.plantuml.com/plantuml/svg/" + title;
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
      canonicalUrl={finalUrl}
      border
    />
  );
}

export default PlantUmlDiagrams;
