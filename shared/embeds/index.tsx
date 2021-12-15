import * as React from "react";
import { EmbedDescriptor } from "rich-markdown-editor/dist/types";
import styled from "styled-components";
import { cdnPath } from "../utils/urls";
import Abstract from "./Abstract";
import Airtable from "./Airtable";
import Bilibili from "./Bilibili";
import Cawemo from "./Cawemo";
import ClickUp from "./ClickUp";
import Codepen from "./Codepen";
import Descript from "./Descript";
import Diagrams from "./Diagrams";
import Figma from "./Figma";
import Framer from "./Framer";
import Gist from "./Gist";
import GoogleCalendar from "./GoogleCalendar";
import GoogleDataStudio from "./GoogleDataStudio";
import GoogleDocs from "./GoogleDocs";
import GoogleDrawings from "./GoogleDrawings";
import GoogleDrive from "./GoogleDrive";
import GoogleSheets from "./GoogleSheets";
import GoogleSlides from "./GoogleSlides";
import InVision from "./InVision";
import Loom from "./Loom";
import Lucidchart from "./Lucidchart";
import Marvel from "./Marvel";
import Mindmeister from "./Mindmeister";
import Miro from "./Miro";
import ModeAnalytics from "./ModeAnalytics";
import Pitch from "./Pitch";
import Prezi from "./Prezi";
import Spotify from "./Spotify";
import Trello from "./Trello";
import Typeform from "./Typeform";
import Vimeo from "./Vimeo";
import Whimsical from "./Whimsical";
import YouTube from "./YouTube";
import Image from "./components/Image";

export type EmbedProps = {
  isSelected: boolean;
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
    title: "Abstract",
    keywords: "design",
    defaultHidden: true,
    icon: () => <Img src={cdnPath("/images/abstract.png")} alt="Abstract" />,
    component: Abstract,
    matcher: matcher(Abstract),
  },
  {
    title: "Airtable",
    keywords: "spreadsheet",
    icon: () => <Img src={cdnPath("/images/airtable.png")} alt="Airtable" />,
    component: Airtable,
    matcher: matcher(Airtable),
  },
  {
    title: "Bilibili",
    keywords: "video",
    defaultHidden: true,
    icon: () => <Img src={cdnPath("/images/bilibili.png")} alt="Bilibili" />,
    component: Bilibili,
    matcher: matcher(Bilibili),
  },
  {
    title: "Cawemo",
    keywords: "bpmn process",
    defaultHidden: true,
    icon: () => <Img src={cdnPath("/images/cawemo.png")} alt="Cawemo" />,
    component: Cawemo,
    matcher: matcher(Cawemo),
  },
  {
    title: "ClickUp",
    keywords: "project",
    icon: () => <Img src={cdnPath("/images/clickup.png")} alt="ClickUp" />,
    component: ClickUp,
    matcher: matcher(ClickUp),
  },
  {
    title: "Codepen",
    keywords: "code editor",
    icon: () => <Img src={cdnPath("/images/codepen.png")} alt="Codepen" />,
    component: Codepen,
    matcher: matcher(Codepen),
  },
  {
    title: "Descript",
    keywords: "audio",
    icon: () => <Img src={cdnPath("/images/descript.png")} alt="Descript" />,
    component: Descript,
    matcher: matcher(Descript),
  },
  {
    title: "Figma",
    keywords: "design svg vector",
    icon: () => <Img src={cdnPath("/images/figma.png")} alt="Figma" />,
    component: Figma,
    matcher: matcher(Figma),
  },
  {
    title: "Framer",
    keywords: "design prototyping",
    icon: () => <Img src={cdnPath("/images/framer.png")} alt="Framer" />,
    component: Framer,
    matcher: matcher(Framer),
  },
  {
    title: "GitHub Gist",
    keywords: "code",
    icon: () => <Img src={cdnPath("/images/github-gist.png")} alt="GitHub" />,
    component: Gist,
    matcher: matcher(Gist),
  },
  {
    title: "Diagrams.net",
    keywords: "diagrams drawio",
    icon: () => (
      <Img src={cdnPath("/images/diagrams.png")} alt="Diagrams.net" />
    ),
    component: Diagrams,
    matcher: matcher(Diagrams),
  },
  {
    title: "Google Drawings",
    keywords: "drawings",
    icon: () => (
      <Img src={cdnPath("/images/google-drawings.png")} alt="Google Drawings" />
    ),
    component: GoogleDrawings,
    matcher: matcher(GoogleDrawings),
  },
  {
    title: "Google Drive",
    keywords: "drive",
    icon: () => (
      <Img src={cdnPath("/images/google-drive.png")} alt="Google Drive" />
    ),
    component: GoogleDrive,
    matcher: matcher(GoogleDrive),
  },
  {
    title: "Google Docs",
    keywords: "documents word",
    icon: () => (
      <Img src={cdnPath("/images/google-docs.png")} alt="Google Docs" />
    ),
    component: GoogleDocs,
    matcher: matcher(GoogleDocs),
  },
  {
    title: "Google Sheets",
    keywords: "excel spreadsheet",
    icon: () => (
      <Img src={cdnPath("/images/google-sheets.png")} alt="Google Sheets" />
    ),
    component: GoogleSheets,
    matcher: matcher(GoogleSheets),
  },
  {
    title: "Google Slides",
    keywords: "presentation slideshow",
    icon: () => (
      <Img src={cdnPath("/images/google-slides.png")} alt="Google Slides" />
    ),
    component: GoogleSlides,
    matcher: matcher(GoogleSlides),
  },
  {
    title: "Google Calendar",
    keywords: "calendar",
    icon: () => (
      <Img src={cdnPath("/images/google-calendar.png")} alt="Google Calendar" />
    ),
    component: GoogleCalendar,
    matcher: matcher(GoogleCalendar),
  },
  {
    title: "Google Data Studio",
    keywords: "bi business intelligence",
    icon: () => (
      <Img
        src={cdnPath("/images/google-datastudio.png")}
        alt="Google Data Studio"
      />
    ),
    component: GoogleDataStudio,
    matcher: matcher(GoogleDataStudio),
  },
  {
    title: "InVision",
    keywords: "design prototype",
    defaultHidden: true,
    icon: () => <Img src={cdnPath("/images/invision.png")} alt="InVision" />,
    component: InVision,
    matcher: matcher(InVision),
  },
  {
    title: "Loom",
    keywords: "video screencast",
    icon: () => <Img src={cdnPath("/images/loom.png")} alt="Loom" />,
    component: Loom,
    matcher: matcher(Loom),
  },
  {
    title: "Lucidchart",
    keywords: "chart",
    icon: () => (
      <Img src={cdnPath("/images/lucidchart.png")} alt="Lucidchart" />
    ),
    component: Lucidchart,
    matcher: matcher(Lucidchart),
  },
  {
    title: "Marvel",
    keywords: "design prototype",
    icon: () => <Img src={cdnPath("/images/marvel.png")} alt="Marvel" />,
    component: Marvel,
    matcher: matcher(Marvel),
  },
  {
    title: "Mindmeister",
    keywords: "mindmap",
    icon: () => (
      <Img src={cdnPath("/images/mindmeister.png")} alt="Mindmeister" />
    ),
    component: Mindmeister,
    matcher: matcher(Mindmeister),
  },
  {
    title: "Miro",
    keywords: "whiteboard",
    icon: () => <Img src={cdnPath("/images/miro.png")} alt="Miro" />,
    component: Miro,
    matcher: matcher(Miro),
  },
  {
    title: "Mode",
    keywords: "analytics",
    defaultHidden: true,
    icon: () => <Img src={cdnPath("/images/mode-analytics.png")} alt="Mode" />,
    component: ModeAnalytics,
    matcher: matcher(ModeAnalytics),
  },
  {
    title: "Pitch",
    keywords: "presentation",
    defaultHidden: true,
    icon: () => <Img src={cdnPath("/images/pitch.png")} alt="Pitch" />,
    component: Pitch,
    matcher: matcher(Pitch),
  },
  {
    title: "Prezi",
    keywords: "presentation",
    icon: () => <Img src={cdnPath("/images/prezi.png")} alt="Prezi" />,
    component: Prezi,
    matcher: matcher(Prezi),
  },
  {
    title: "Spotify",
    keywords: "music",
    icon: () => <Img src={cdnPath("/images/spotify.png")} alt="Spotify" />,
    component: Spotify,
    matcher: matcher(Spotify),
  },
  {
    title: "Trello",
    keywords: "kanban",
    icon: () => <Img src={cdnPath("/images/trello.png")} alt="Trello" />,
    component: Trello,
    matcher: matcher(Trello),
  },
  {
    title: "Typeform",
    keywords: "form survey",
    icon: () => <Img src={cdnPath("/images/typeform.png")} alt="Typeform" />,
    component: Typeform,
    matcher: matcher(Typeform),
  },
  {
    title: "Vimeo",
    keywords: "video",
    icon: () => <Img src={cdnPath("/images/vimeo.png")} alt="Vimeo" />,
    component: Vimeo,
    matcher: matcher(Vimeo),
  },
  {
    title: "Whimsical",
    keywords: "whiteboard",
    icon: () => <Img src={cdnPath("/images/whimsical.png")} alt="Whimsical" />,
    component: Whimsical,
    matcher: matcher(Whimsical),
  },
  {
    title: "YouTube",
    keywords: "google video",
    icon: () => <Img src={cdnPath("/images/youtube.png")} alt="YouTube" />,
    component: YouTube,
    matcher: matcher(YouTube),
  },
];

export default embeds;
