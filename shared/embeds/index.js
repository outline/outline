// @flow
import * as React from "react";
import styled from "styled-components";
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
import Prezi from "./Prezi";
import Spotify from "./Spotify";
import Trello from "./Trello";
import Typeform from "./Typeform";
import Vimeo from "./Vimeo";
import YouTube from "./YouTube";
import Image from "./components/Image";

function matcher(Component) {
  return (url: string) => {
    const regexes = Component.ENABLED;
    for (const regex of regexes) {
      const result = url.match(regex);
      if (result) {
        return result;
      }
    }
  };
}

const Img = styled(Image)`
  margin: 4px;
  width: 18px;
  height: 18px;
`;

export default [
  {
    title: "Abstract",
    keywords: "design",
    icon: () => <Img src="/images/abstract.png" />,
    component: Abstract,
    matcher: matcher(Abstract),
  },
  {
    title: "Airtable",
    keywords: "spreadsheet",
    icon: () => <Img src="/images/airtable.png" />,
    component: Airtable,
    matcher: matcher(Airtable),
  },
  {
    title: "Bilibili",
    keywords: "video",
    icon: () => <Img src="/images/bilibili.png" />,
    component: Bilibili,
    matcher: matcher(Bilibili),
  },
  {
    title: "Cawemo",
    keywords: "bpmn process",
    defaultHidden: true,
    icon: () => <Img src="/images/cawemo.png" />,
    component: Cawemo,
    matcher: matcher(Cawemo),
  },
  {
    title: "ClickUp",
    keywords: "project",
    defaultHidden: true,
    icon: () => <Img src="/images/clickup.png" />,
    component: ClickUp,
    matcher: matcher(ClickUp),
  },
  {
    title: "Codepen",
    keywords: "code editor",
    icon: () => <Img src="/images/codepen.png" />,
    component: Codepen,
    matcher: matcher(Codepen),
  },
  {
    title: "Descript",
    keywords: "audio",
    icon: () => <Img src="/images/descript.png" />,
    component: Descript,
    matcher: matcher(Descript),
  },
  {
    title: "Figma",
    keywords: "design svg vector",
    icon: () => <Img src="/images/figma.png" />,
    component: Figma,
    matcher: matcher(Figma),
  },
  {
    title: "Framer",
    keywords: "design prototyping",
    icon: () => <Img src="/images/framer.png" />,
    component: Framer,
    matcher: matcher(Framer),
  },
  {
    title: "GitHub Gist",
    keywords: "code",
    icon: () => <Img src="/images/github-gist.png" />,
    component: Gist,
    matcher: matcher(Gist),
  },
  {
    title: "Diagrams.net",
    keywords: "diagrams drawio",
    icon: () => <Img src="/images/diagrams.png" />,
    component: Diagrams,
    matcher: matcher(Diagrams),
  },
  {
    title: "Google Drawings",
    keywords: "drawings",
    icon: () => <Img src="/images/google-drawings.png" />,
    component: GoogleDrawings,
    matcher: matcher(GoogleDrawings),
  },
  {
    title: "Google Drive",
    keywords: "drive",
    icon: () => <Img src="/images/google-drive.png" />,
    component: GoogleDrive,
    matcher: matcher(GoogleDrive),
  },
  {
    title: "Google Docs",
    icon: () => <Img src="/images/google-docs.png" />,
    component: GoogleDocs,
    matcher: matcher(GoogleDocs),
  },
  {
    title: "Google Sheets",
    keywords: "excel spreadsheet",
    icon: () => <Img src="/images/google-sheets.png" />,
    component: GoogleSheets,
    matcher: matcher(GoogleSheets),
  },
  {
    title: "Google Slides",
    keywords: "presentation slideshow",
    icon: () => <Img src="/images/google-slides.png" />,
    component: GoogleSlides,
    matcher: matcher(GoogleSlides),
  },
  {
    title: "Google Calendar",
    keywords: "calendar",
    icon: () => <Img src="/images/google-calendar.png" />,
    component: GoogleCalendar,
    matcher: matcher(GoogleCalendar),
  },
  {
    title: "Google Data Studio",
    keywords: "business intelligence",
    icon: () => <Img src="/images/google-datastudio.png" />,
    component: GoogleDataStudio,
    matcher: matcher(GoogleDataStudio),
  },
  {
    title: "InVision",
    keywords: "design prototype",
    defaultHidden: true,
    icon: () => <Img src="/images/invision.png" />,
    component: InVision,
    matcher: matcher(InVision),
  },
  {
    title: "Loom",
    keywords: "video screencast",
    icon: () => <Img src="/images/loom.png" />,
    component: Loom,
    matcher: matcher(Loom),
  },
  {
    title: "Lucidchart",
    keywords: "chart",
    icon: () => <Img src="/images/lucidchart.png" />,
    component: Lucidchart,
    matcher: matcher(Lucidchart),
  },
  {
    title: "Marvel",
    keywords: "design prototype",
    icon: () => <Img src="/images/marvel.png" />,
    component: Marvel,
    matcher: matcher(Marvel),
  },
  {
    title: "Mindmeister",
    keywords: "mindmap",
    icon: () => <Img src="/images/mindmeister.png" />,
    component: Mindmeister,
    matcher: matcher(Mindmeister),
  },
  {
    title: "Miro",
    keywords: "whiteboard",
    icon: () => <Img src="/images/miro.png" />,
    component: Miro,
    matcher: matcher(Miro),
  },
  {
    title: "Mode",
    keywords: "analytics",
    defaultHidden: true,
    icon: () => <Img src="/images/mode-analytics.png" />,
    component: ModeAnalytics,
    matcher: matcher(ModeAnalytics),
  },
  {
    title: "Prezi",
    keywords: "presentation",
    icon: () => <Img src="/images/prezi.png" />,
    component: Prezi,
    matcher: matcher(Prezi),
  },
  {
    title: "Spotify",
    keywords: "music",
    icon: () => <Img src="/images/spotify.png" />,
    component: Spotify,
    matcher: matcher(Spotify),
  },
  {
    title: "Trello",
    keywords: "kanban",
    icon: () => <Img src="/images/trello.png" />,
    component: Trello,
    matcher: matcher(Trello),
  },
  {
    title: "Typeform",
    keywords: "form survey",
    icon: () => <Img src="/images/typeform.png" />,
    component: Typeform,
    matcher: matcher(Typeform),
  },
  {
    title: "Vimeo",
    keywords: "video",
    icon: () => <Img src="/images/vimeo.png" />,
    component: Vimeo,
    matcher: matcher(Vimeo),
  },
  {
    title: "YouTube",
    keywords: "google video",
    icon: () => <Img src="/images/youtube.png" />,
    component: YouTube,
    matcher: matcher(YouTube),
  },
];
