import * as React from "react";
import styled from "styled-components";
import { EmbedDescriptor } from "@shared/editor/types";
import Diagrams from "./Diagrams";
import Figma from "./Figma";
import Gist from "./Gist";
import Vimeo from "./Vimeo";
import YouTube from "./YouTube";
import Image from "./components/Image";

export type EmbedProps = {
  isSelected: boolean;
  isEditable: boolean;
  embed: EmbedDescriptor;
  attrs: {
    href: string;
    matches: RegExpMatchArray;
  };
};

function matcher(Component: React.ComponentType<EmbedProps>) {
  return (url: string): boolean | [] | RegExpMatchArray => {
    // @ts-expect-error not aware of static
    const regexes = Component.ENABLED;

    for (const regex of regexes) {
      const result = url.match(regex);

      if (result) {
        return result;
      }
    }

    return false;
  };
}

const Img = styled(Image)`
  margin: 4px;
  width: 18px;
  height: 18px;
`;

const embeds: EmbedDescriptor[] = [
  {
    title: "Figma",
    keywords: "design svg vector",
    defaultHidden: true,
    icon: () => <Img src="/images/figma.png" alt="Figma" />,
    component: Figma,
    matcher: matcher(Figma),
  },
  {
    title: "GitHub Gist",
    keywords: "code",
    defaultHidden: true,
    icon: () => <Img src="/images/github-gist.png" alt="GitHub" />,
    component: Gist,
    matcher: matcher(Gist),
  },
  {
    title: "Diagrams.net",
    keywords: "diagrams drawio",
    defaultHidden: true,
    icon: () => <Img src="/images/diagrams.png" alt="Diagrams.net" />,
    component: Diagrams,
    matcher: matcher(Diagrams),
  },
  {
    title: "Vimeo",
    keywords: "video",
    icon: () => <Img src="/images/vimeo.png" alt="Vimeo" />,
    component: Vimeo,
    matcher: matcher(Vimeo),
  },
  {
    title: "YouTube",
    keywords: "google video",
    icon: () => <Img src="/images/youtube.png" alt="YouTube" />,
    component: YouTube,
    matcher: matcher(YouTube),
  },
];

export default embeds;
