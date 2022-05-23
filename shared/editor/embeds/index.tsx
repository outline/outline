import * as React from "react";
import styled from "styled-components";
import { EmbedDescriptor } from "@shared/editor/types";
import Image from "../components/Image";
import Abstract from "./Abstract";
import Airtable from "./Airtable";
import Berrycast from "./Berrycast";
import Bilibili from "./Bilibili";
import Cawemo from "./Cawemo";
import ClickUp from "./ClickUp";
import Codepen from "./Codepen";
import DBDiagram from "./DBDiagram";
import Descript from "./Descript";
import Diagrams from "./Diagrams";
import Figma from "./Figma";
import Framer from "./Framer";
import Gist from "./Gist";
import Gliffy from "./Gliffy";
import GoogleCalendar from "./GoogleCalendar";
import GoogleDataStudio from "./GoogleDataStudio";
import GoogleDocs from "./GoogleDocs";
import GoogleDrawings from "./GoogleDrawings";
import GoogleDrive from "./GoogleDrive";
import GoogleSheets from "./GoogleSheets";
import GoogleSlides from "./GoogleSlides";
import InVision from "./InVision";
import JSFiddle from "./JSFiddle";
import Loom from "./Loom";
import Lucidchart from "./Lucidchart";
import Marvel from "./Marvel";
import Mindmeister from "./Mindmeister";
import Miro from "./Miro";
import ModeAnalytics from "./ModeAnalytics";
import Otter from "./Otter";
import Pitch from "./Pitch";
import Prezi from "./Prezi";
import Scribe from "./Scribe";
import Spotify from "./Spotify";
import Tldraw from "./Tldraw";
import Trello from "./Trello";
import Typeform from "./Typeform";
import Vimeo from "./Vimeo";
import Whimsical from "./Whimsical";
import YouTube from "./YouTube";

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
    title: "Abstract",
    keywords: "design",
    defaultHidden: true,
    icon: () => <Img src="/images/abstract.png" alt="Abstract" />,
    component: Abstract,
    matcher: matcher(Abstract),
  },
  {
    title: "Airtable",
    keywords: "spreadsheet",
    icon: () => <Img src="/images/airtable.png" alt="Airtable" />,
    component: Airtable,
    matcher: matcher(Airtable),
  },
  {
    title: "Berrycast",
    keywords: "video",
    defaultHidden: true,
    icon: () => <Img src="/images/berrycast.png" alt="Berrycast" />,
    component: Berrycast,
    matcher: matcher(Berrycast),
  },
  {
    title: "Bilibili",
    keywords: "video",
    defaultHidden: true,
    icon: () => <Img src="/images/bilibili.png" alt="Bilibili" />,
    component: Bilibili,
    matcher: matcher(Bilibili),
  },
  {
    title: "Cawemo",
    keywords: "bpmn process",
    defaultHidden: true,
    icon: () => <Img src="/images/cawemo.png" alt="Cawemo" />,
    component: Cawemo,
    matcher: matcher(Cawemo),
  },
  {
    title: "ClickUp",
    keywords: "project",
    icon: () => <Img src="/images/clickup.png" alt="ClickUp" />,
    component: ClickUp,
    matcher: matcher(ClickUp),
  },
  {
    title: "Codepen",
    keywords: "code editor",
    icon: () => <Img src="/images/codepen.png" alt="Codepen" />,
    component: Codepen,
    matcher: matcher(Codepen),
  },
  {
    title: "DBDiagram",
    keywords: "diagrams database",
    icon: () => <Img src="/images/dbdiagram.png" alt="DBDiagram" />,
    component: DBDiagram,
    matcher: matcher(DBDiagram),
  },
  {
    title: "Descript",
    keywords: "audio",
    icon: () => <Img src="/images/descript.png" alt="Descript" />,
    component: Descript,
    matcher: matcher(Descript),
  },
  {
    title: "Figma",
    keywords: "design svg vector",
    icon: () => <Img src="/images/figma.png" alt="Figma" />,
    component: Figma,
    matcher: matcher(Figma),
  },
  {
    title: "Framer",
    keywords: "design prototyping",
    icon: () => <Img src="/images/framer.png" alt="Framer" />,
    component: Framer,
    matcher: matcher(Framer),
  },
  {
    title: "GitHub Gist",
    keywords: "code",
    icon: () => <Img src="/images/github-gist.png" alt="GitHub" />,
    component: Gist,
    matcher: matcher(Gist),
  },
  {
    title: "Gliffy",
    keywords: "diagram",
    icon: () => <Img src="/images/gliffy.png" alt="Gliffy" />,
    component: Gliffy,
    matcher: matcher(Gliffy),
  },
  {
    title: "Diagrams.net",
    keywords: "diagrams drawio",
    icon: () => <Img src="/images/diagrams.png" alt="Diagrams.net" />,
    component: Diagrams,
    matcher: matcher(Diagrams),
  },
  {
    title: "Google Drawings",
    keywords: "drawings",
    icon: () => <Img src="/images/google-drawings.png" alt="Google Drawings" />,
    component: GoogleDrawings,
    matcher: matcher(GoogleDrawings),
  },
  {
    title: "Google Drive",
    keywords: "drive",
    icon: () => <Img src="/images/google-drive.png" alt="Google Drive" />,
    component: GoogleDrive,
    matcher: matcher(GoogleDrive),
  },
  {
    title: "Google Docs",
    keywords: "documents word",
    icon: () => <Img src="/images/google-docs.png" alt="Google Docs" />,
    component: GoogleDocs,
    matcher: matcher(GoogleDocs),
  },
  {
    title: "Google Sheets",
    keywords: "excel spreadsheet",
    icon: () => <Img src="/images/google-sheets.png" alt="Google Sheets" />,
    component: GoogleSheets,
    matcher: matcher(GoogleSheets),
  },
  {
    title: "Google Slides",
    keywords: "presentation slideshow",
    icon: () => <Img src="/images/google-slides.png" alt="Google Slides" />,
    component: GoogleSlides,
    matcher: matcher(GoogleSlides),
  },
  {
    title: "Google Calendar",
    keywords: "calendar",
    icon: () => <Img src="/images/google-calendar.png" alt="Google Calendar" />,
    component: GoogleCalendar,
    matcher: matcher(GoogleCalendar),
  },
  {
    title: "Google Data Studio",
    keywords: "bi business intelligence",
    icon: () => (
      <Img src="/images/google-datastudio.png" alt="Google Data Studio" />
    ),
    component: GoogleDataStudio,
    matcher: matcher(GoogleDataStudio),
  },
  {
    title: "InVision",
    keywords: "design prototype",
    defaultHidden: true,
    icon: () => <Img src="/images/invision.png" alt="InVision" />,
    component: InVision,
    matcher: matcher(InVision),
  },
  {
    title: "JSFiddle",
    keywords: "code",
    defaultHidden: true,
    icon: () => <Img src="/images/jsfiddle.png" alt="JSFiddle" />,
    component: JSFiddle,
    matcher: matcher(JSFiddle),
  },
  {
    title: "Loom",
    keywords: "video screencast",
    icon: () => <Img src="/images/loom.png" alt="Loom" />,
    component: Loom,
    matcher: matcher(Loom),
  },
  {
    title: "Lucidchart",
    keywords: "chart",
    icon: () => <Img src="/images/lucidchart.png" alt="Lucidchart" />,
    component: Lucidchart,
    matcher: matcher(Lucidchart),
  },
  {
    title: "Marvel",
    keywords: "design prototype",
    icon: () => <Img src="/images/marvel.png" alt="Marvel" />,
    component: Marvel,
    matcher: matcher(Marvel),
  },
  {
    title: "Mindmeister",
    keywords: "mindmap",
    icon: () => <Img src="/images/mindmeister.png" alt="Mindmeister" />,
    component: Mindmeister,
    matcher: matcher(Mindmeister),
  },
  {
    title: "Miro",
    keywords: "whiteboard",
    icon: () => <Img src="/images/miro.png" alt="Miro" />,
    component: Miro,
    matcher: matcher(Miro),
  },
  {
    title: "Mode",
    keywords: "analytics",
    defaultHidden: true,
    icon: () => <Img src="/images/mode-analytics.png" alt="Mode" />,
    component: ModeAnalytics,
    matcher: matcher(ModeAnalytics),
  },
  {
    title: "Otter.ai",
    keywords: "audio transcription meeting notes",
    defaultHidden: true,
    icon: () => <Img src="/images/otter.png" alt="Otter.ai" />,
    component: Otter,
    matcher: matcher(Otter),
  },
  {
    title: "Pitch",
    keywords: "presentation",
    defaultHidden: true,
    icon: () => <Img src="/images/pitch.png" alt="Pitch" />,
    component: Pitch,
    matcher: matcher(Pitch),
  },
  {
    title: "Prezi",
    keywords: "presentation",
    icon: () => <Img src="/images/prezi.png" alt="Prezi" />,
    component: Prezi,
    matcher: matcher(Prezi),
  },
  {
    title: "Scribe",
    keywords: "screencast",
    icon: () => <Img src="/images/scribe.png" alt="Scribe" />,
    component: Scribe,
    matcher: matcher(Scribe),
  },
  {
    title: "Spotify",
    keywords: "music",
    icon: () => <Img src="/images/spotify.png" alt="Spotify" />,
    component: Spotify,
    matcher: matcher(Spotify),
  },
  {
    title: "Tldraw",
    keywords: "draw schematics diagrams",
    icon: () => <Img src="/images/tldraw.png" alt="Tldraw" />,
    component: Tldraw,
    matcher: matcher(Tldraw),
  },
  {
    title: "Trello",
    keywords: "kanban",
    icon: () => <Img src="/images/trello.png" alt="Trello" />,
    component: Trello,
    matcher: matcher(Trello),
  },
  {
    title: "Typeform",
    keywords: "form survey",
    icon: () => <Img src="/images/typeform.png" alt="Typeform" />,
    component: Typeform,
    matcher: matcher(Typeform),
  },
  {
    title: "Vimeo",
    keywords: "video",
    icon: () => <Img src="/images/vimeo.png" alt="Vimeo" />,
    component: Vimeo,
    matcher: matcher(Vimeo),
  },
  {
    title: "Whimsical",
    keywords: "whiteboard",
    icon: () => <Img src="/images/whimsical.png" alt="Whimsical" />,
    component: Whimsical,
    matcher: matcher(Whimsical),
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
