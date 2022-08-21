import { EditorState } from "prosemirror-state";
import * as React from "react";
import styled from "styled-components";
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
import GoogleForms from "./GoogleForms";
import GoogleSheets from "./GoogleSheets";
import GoogleSlides from "./GoogleSlides";
import Grist from "./Grist";
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

const Img = styled(Image)`
  border-radius: 2px;
  background: #fff;
  box-shadow: 0 0 0 1px #fff;
  margin: 4px;
  width: 18px;
  height: 18px;
`;

export class EmbedDescriptor {
  icon: React.FC<any>;
  name?: string;
  title?: string;
  shortcut?: string;
  keywords?: string;
  tooltip?: string;
  defaultHidden?: boolean;
  attrs?: Record<string, any>;
  visible?: boolean;
  active?: (state: EditorState) => boolean;
  component: typeof React.Component | React.FC<any>;
  host?: string;

  constructor(options: Omit<EmbedDescriptor, "matcher">) {
    this.icon = options.icon;
    this.name = options.name;
    this.title = options.title;
    this.shortcut = options.shortcut;
    this.keywords = options.keywords;
    this.tooltip = options.tooltip;
    this.defaultHidden = options.defaultHidden;
    this.attrs = options.attrs;
    this.visible = options.visible;
    this.active = options.active;
    this.component = options.component;
    this.host = options.host;
  }

  matcher(url: string): boolean | [] | RegExpMatchArray {
    // @ts-expect-error not aware of static
    let regexes = this.component.ENABLED;

    try {
      const urlObj = new URL(this.host as string | URL);
      regexes = [
        new RegExp(
          `^${urlObj.protocol}//${urlObj.host.replace(/\./g, "\\.")}${
            // @ts-expect-error not aware of static
            this.component.URL_PATH_REGEX
          }`
        ),
      ];
    } catch (err) {
      // no-op
    }

    for (const regex of regexes) {
      const result = url.match(regex);

      if (result) {
        return result;
      }
    }

    return false;
  }
}

const embeds: EmbedDescriptor[] = [
  new EmbedDescriptor({
    title: "Abstract",
    keywords: "design",
    defaultHidden: true,
    icon: () => <Img src="/images/abstract.png" alt="Abstract" />,
    component: Abstract,
  }),
  new EmbedDescriptor({
    title: "Airtable",
    keywords: "spreadsheet",
    icon: () => <Img src="/images/airtable.png" alt="Airtable" />,
    component: Airtable,
  }),
  new EmbedDescriptor({
    title: "Berrycast",
    keywords: "video",
    defaultHidden: true,
    icon: () => <Img src="/images/berrycast.png" alt="Berrycast" />,
    component: Berrycast,
  }),
  new EmbedDescriptor({
    title: "Bilibili",
    keywords: "video",
    defaultHidden: true,
    icon: () => <Img src="/images/bilibili.png" alt="Bilibili" />,
    component: Bilibili,
  }),
  new EmbedDescriptor({
    title: "Cawemo",
    keywords: "bpmn process",
    defaultHidden: true,
    icon: () => <Img src="/images/cawemo.png" alt="Cawemo" />,
    component: Cawemo,
  }),
  new EmbedDescriptor({
    title: "ClickUp",
    keywords: "project",
    icon: () => <Img src="/images/clickup.png" alt="ClickUp" />,
    component: ClickUp,
  }),
  new EmbedDescriptor({
    title: "Codepen",
    keywords: "code editor",
    icon: () => <Img src="/images/codepen.png" alt="Codepen" />,
    component: Codepen,
  }),
  new EmbedDescriptor({
    title: "DBDiagram",
    keywords: "diagrams database",
    icon: () => <Img src="/images/dbdiagram.png" alt="DBDiagram" />,
    component: DBDiagram,
  }),
  new EmbedDescriptor({
    title: "Descript",
    keywords: "audio",
    icon: () => <Img src="/images/descript.png" alt="Descript" />,
    component: Descript,
  }),
  new EmbedDescriptor({
    title: "Figma",
    keywords: "design svg vector",
    icon: () => <Img src="/images/figma.png" alt="Figma" />,
    component: Figma,
  }),
  new EmbedDescriptor({
    title: "Framer",
    keywords: "design prototyping",
    icon: () => <Img src="/images/framer.png" alt="Framer" />,
    component: Framer,
  }),
  new EmbedDescriptor({
    title: "GitHub Gist",
    keywords: "code",
    icon: () => <Img src="/images/github-gist.png" alt="GitHub" />,
    component: Gist,
  }),
  new EmbedDescriptor({
    title: "Gliffy",
    keywords: "diagram",
    icon: () => <Img src="/images/gliffy.png" alt="Gliffy" />,
    component: Gliffy,
  }),
  new EmbedDescriptor({
    title: "Diagrams.net",
    keywords: "diagrams drawio",
    icon: () => <Img src="/images/diagrams.png" alt="Diagrams.net" />,
    component: Diagrams,
  }),
  new EmbedDescriptor({
    title: "Google Drawings",
    keywords: "drawings",
    icon: () => <Img src="/images/google-drawings.png" alt="Google Drawings" />,
    component: GoogleDrawings,
  }),
  new EmbedDescriptor({
    title: "Google Drive",
    keywords: "drive",
    icon: () => <Img src="/images/google-drive.png" alt="Google Drive" />,
    component: GoogleDrive,
  }),
  new EmbedDescriptor({
    title: "Google Docs",
    keywords: "documents word",
    icon: () => <Img src="/images/google-docs.png" alt="Google Docs" />,
    component: GoogleDocs,
  }),
  new EmbedDescriptor({
    title: "Google Sheets",
    keywords: "excel spreadsheet",
    icon: () => <Img src="/images/google-sheets.png" alt="Google Sheets" />,
    component: GoogleSheets,
  }),
  new EmbedDescriptor({
    title: "Google Slides",
    keywords: "presentation slideshow",
    icon: () => <Img src="/images/google-slides.png" alt="Google Slides" />,
    component: GoogleSlides,
  }),
  new EmbedDescriptor({
    title: "Google Calendar",
    keywords: "calendar",
    icon: () => <Img src="/images/google-calendar.png" alt="Google Calendar" />,
    component: GoogleCalendar,
  }),
  new EmbedDescriptor({
    title: "Google Data Studio",
    keywords: "bi business intelligence",
    icon: () => (
      <Img src="/images/google-datastudio.png" alt="Google Data Studio" />
    ),
    component: GoogleDataStudio,
  }),
  new EmbedDescriptor({
    title: "Google Forms",
    keywords: "form survey",
    icon: () => <Img src="/images/google-forms.png" alt="Google Forms" />,
    component: GoogleForms,
  }),
  new EmbedDescriptor({
    title: "Grist",
    keywords: "spreadsheet",
    icon: () => <Img src="/images/grist.png" alt="Grist" />,
    component: Grist,
  }),
  new EmbedDescriptor({
    title: "InVision",
    keywords: "design prototype",
    defaultHidden: true,
    icon: () => <Img src="/images/invision.png" alt="InVision" />,
    component: InVision,
  }),
  new EmbedDescriptor({
    title: "JSFiddle",
    keywords: "code",
    defaultHidden: true,
    icon: () => <Img src="/images/jsfiddle.png" alt="JSFiddle" />,
    component: JSFiddle,
  }),
  new EmbedDescriptor({
    title: "Loom",
    keywords: "video screencast",
    icon: () => <Img src="/images/loom.png" alt="Loom" />,
    component: Loom,
  }),
  new EmbedDescriptor({
    title: "Lucidchart",
    keywords: "chart",
    icon: () => <Img src="/images/lucidchart.png" alt="Lucidchart" />,
    component: Lucidchart,
  }),
  new EmbedDescriptor({
    title: "Marvel",
    keywords: "design prototype",
    icon: () => <Img src="/images/marvel.png" alt="Marvel" />,
    component: Marvel,
  }),
  new EmbedDescriptor({
    title: "Mindmeister",
    keywords: "mindmap",
    icon: () => <Img src="/images/mindmeister.png" alt="Mindmeister" />,
    component: Mindmeister,
  }),
  new EmbedDescriptor({
    title: "Miro",
    keywords: "whiteboard",
    icon: () => <Img src="/images/miro.png" alt="Miro" />,
    component: Miro,
  }),
  new EmbedDescriptor({
    title: "Mode",
    keywords: "analytics",
    defaultHidden: true,
    icon: () => <Img src="/images/mode-analytics.png" alt="Mode" />,
    component: ModeAnalytics,
  }),
  new EmbedDescriptor({
    title: "Otter.ai",
    keywords: "audio transcription meeting notes",
    defaultHidden: true,
    icon: () => <Img src="/images/otter.png" alt="Otter.ai" />,
    component: Otter,
  }),
  new EmbedDescriptor({
    title: "Pitch",
    keywords: "presentation",
    defaultHidden: true,
    icon: () => <Img src="/images/pitch.png" alt="Pitch" />,
    component: Pitch,
  }),
  new EmbedDescriptor({
    title: "Prezi",
    keywords: "presentation",
    icon: () => <Img src="/images/prezi.png" alt="Prezi" />,
    component: Prezi,
  }),
  new EmbedDescriptor({
    title: "Scribe",
    keywords: "screencast",
    icon: () => <Img src="/images/scribe.png" alt="Scribe" />,
    component: Scribe,
  }),
  new EmbedDescriptor({
    title: "Spotify",
    keywords: "music",
    icon: () => <Img src="/images/spotify.png" alt="Spotify" />,
    component: Spotify,
  }),
  new EmbedDescriptor({
    title: "Tldraw",
    keywords: "draw schematics diagrams",
    icon: () => <Img src="/images/tldraw.png" alt="Tldraw" />,
    component: Tldraw,
  }),
  new EmbedDescriptor({
    title: "Trello",
    keywords: "kanban",
    icon: () => <Img src="/images/trello.png" alt="Trello" />,
    component: Trello,
  }),
  new EmbedDescriptor({
    title: "Typeform",
    keywords: "form survey",
    icon: () => <Img src="/images/typeform.png" alt="Typeform" />,
    component: Typeform,
  }),
  new EmbedDescriptor({
    title: "Vimeo",
    keywords: "video",
    icon: () => <Img src="/images/vimeo.png" alt="Vimeo" />,
    component: Vimeo,
  }),
  new EmbedDescriptor({
    title: "Whimsical",
    keywords: "whiteboard",
    icon: () => <Img src="/images/whimsical.png" alt="Whimsical" />,
    component: Whimsical,
  }),
  new EmbedDescriptor({
    title: "YouTube",
    keywords: "google video",
    icon: () => <Img src="/images/youtube.png" alt="YouTube" />,
    component: YouTube,
  }),
];

export default embeds;
