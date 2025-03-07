import * as React from "react";
import styled from "styled-components";
import { Primitive } from "utility-types";
import env from "../../env";
import { IntegrationService, IntegrationType } from "../../types";
import type { IntegrationSettings } from "../../types";
import { urlRegex } from "../../utils/urls";
import Image from "../components/Img";
import Berrycast from "./Berrycast";
import Diagrams from "./Diagrams";
import Dropbox from "./Dropbox";
import Gist from "./Gist";
import GitLabSnippet from "./GitLabSnippet";
import InVision from "./InVision";
import JSFiddle from "./JSFiddle";
import Linkedin from "./Linkedin";
import Pinterest from "./Pinterest";
import Spotify from "./Spotify";
import Trello from "./Trello";
import Vimeo from "./Vimeo";
import YouTube from "./YouTube";

export type EmbedProps = {
  isSelected: boolean;
  isEditable: boolean;
  embed: EmbedDescriptor;
  matches: RegExpMatchArray;
  attrs: {
    href: string;
  };
};

const Img = styled(Image)`
  border-radius: 3px;
  background: #fff;
  box-shadow: 0 0 0 1px ${(props) => props.theme.divider};
  margin: 3px;
  width: 18px;
  height: 18px;
`;

export class EmbedDescriptor {
  /** An icon that will be used to represent the embed in menus */
  icon?: React.ReactNode;
  /** The name of the embed. If this embed has a matching integration it should match IntegrationService */
  name?: string;
  /** The title of the embed */
  title: string;
  /** A placeholder that will be shown in the URL input */
  placeholder?: string;
  /** A keyboard shortcut that will trigger the embed */
  shortcut?: string;
  /** Keywords that will match this embed in menus */
  keywords?: string;
  /** A tooltip that will be shown in menus */
  tooltip?: string;
  /** Whether the embed should be hidden in menus by default */
  defaultHidden?: boolean;
  /** Whether the bottom toolbar should be hidden – use this when the embed itself includes a footer */
  hideToolbar?: boolean;
  /** Whether the embed should match automatically when pasting a URL (default to true) */
  matchOnInput?: boolean;
  /** A regex that will be used to match the embed from a URL. */
  regexMatch?: RegExp[];
  /**
   * A function that will be used to transform the URL. The resulting string is passed as the src
   * to the iframe. You can perform any transformations you want here, including changing the domain
   *
   * If a custom display is needed this function should be left undefined and `component` should be
   * used instead.
   */
  transformMatch?: (matches: RegExpMatchArray) => string;
  /** The node attributes */
  attrs?: Record<string, Primitive>;
  /** Whether the embed should be visible in menus, always true */
  visible?: boolean;
  /**
   * A React component that will be used to render the embed, if displaying a simple iframe then
   * `transformMatch` should be used instead.
   */
  component?: React.FunctionComponent<EmbedProps>;
  /** The integration settings, if any */
  settings?: IntegrationSettings<IntegrationType.Embed>;

  constructor(options: Omit<EmbedDescriptor, "matcher">) {
    this.icon = options.icon;
    this.name = options.name;
    this.title = options.title;
    this.placeholder = options.placeholder;
    this.shortcut = options.shortcut;
    this.keywords = options.keywords;
    this.tooltip = options.tooltip;
    this.defaultHidden = options.defaultHidden;
    this.hideToolbar = options.hideToolbar;
    this.matchOnInput = options.matchOnInput ?? true;
    this.regexMatch = options.regexMatch;
    this.transformMatch = options.transformMatch;
    this.attrs = options.attrs;
    this.visible = options.visible;
    this.component = options.component;
  }

  matcher(url: string): false | RegExpMatchArray {
    const regexes = this.regexMatch ?? [];
    const settingsDomainRegex = this.settings?.url
      ? urlRegex(this.settings?.url)
      : undefined;

    if (settingsDomainRegex) {
      regexes.unshift(settingsDomainRegex);
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
    icon: <Img src="/images/abstract.png" alt="Abstract" />,
    regexMatch: [
      new RegExp("^https?://share\\.(?:go)?abstract\\.com/(.*)$"),
      new RegExp("^https?://app\\.(?:go)?abstract\\.com/(?:share|embed)/(.*)$"),
    ],
    transformMatch: (matches: RegExpMatchArray) =>
      `https://app.goabstract.com/embed/${matches[1]}`,
  }),
  new EmbedDescriptor({
    title: "Airtable",
    keywords: "spreadsheet",
    icon: <Img src="/images/airtable.png" alt="Airtable" />,
    regexMatch: [
      new RegExp("^https://airtable.com/(?:embed/)?(app.*/)?(shr.*)$"),
      new RegExp("^https://airtable.com/(app.*/)?(pag.*)/form$"),
    ],
    transformMatch: (matches: RegExpMatchArray) =>
      `https://airtable.com/embed/${matches[1] ?? ""}${matches[2]}`,
  }),
  new EmbedDescriptor({
    title: "Berrycast",
    keywords: "video",
    defaultHidden: true,
    regexMatch: [/^https:\/\/(www\.)?berrycast.com\/conversations\/(.*)$/i],
    icon: <Img src="/images/berrycast.png" alt="Berrycast" />,
    component: Berrycast,
  }),
  new EmbedDescriptor({
    title: "Bilibili",
    keywords: "video",
    defaultHidden: true,
    regexMatch: [
      /(?:https?:\/\/)?(www\.bilibili\.com)\/video\/([\w\d]+)?(\?\S+)?/i,
    ],
    transformMatch: (matches: RegExpMatchArray) =>
      `https://player.bilibili.com/player.html?bvid=${matches[2]}&page=1&high_quality=1&autoplay=0`,
    icon: <Img src="/images/bilibili.png" alt="Bilibili" />,
  }),
  new EmbedDescriptor({
    title: "Camunda Modeler",
    keywords: "bpmn process cawemo",
    defaultHidden: true,
    regexMatch: [
      new RegExp("^https?://modeler.cloud.camunda.io/(?:share|embed)/(.*)$"),
    ],
    transformMatch: (matches: RegExpMatchArray) =>
      `https://modeler.cloud.camunda.io/embed/${matches[1]}`,
    icon: <Img src="/images/camunda.png" alt="Camunda" />,
  }),
  new EmbedDescriptor({
    title: "Canva",
    keywords: "design",
    regexMatch: [
      /^https:\/\/(?:www\.)?canva\.com\/design\/([\/a-zA-Z0-9_\-]*)$/,
    ],
    transformMatch: (matches: RegExpMatchArray) => {
      const input = matches.input ?? matches[0];

      try {
        const url = new URL(input);
        const params = new URLSearchParams(url.search);
        params.append("embed", "");
        return `${url.origin}${url.pathname}?${params.toString()}`;
      } catch (e) {
        //
      }

      return input;
    },
    icon: <Img src="/images/canva.png" alt="Canva" />,
  }),
  new EmbedDescriptor({
    title: "Cawemo",
    keywords: "bpmn process",
    defaultHidden: true,
    regexMatch: [new RegExp("^https?://cawemo.com/(?:share|embed)/(.*)$")],
    transformMatch: (matches: RegExpMatchArray) =>
      `https://cawemo.com/embed/${matches[1]}`,
    icon: <Img src="/images/cawemo.png" alt="Cawemo" />,
  }),
  new EmbedDescriptor({
    title: "ClickUp",
    keywords: "project",
    regexMatch: [
      new RegExp("^https?://share\\.clickup\\.com/[a-z]/[a-z]/(.*)/(.*)$"),
      new RegExp(
        "^https?://sharing\\.clickup\\.com/[0-9]+/[a-z]/[a-z]/(.*)/(.*)$"
      ),
    ],
    transformMatch: (matches: RegExpMatchArray) => matches[0],
    icon: <Img src="/images/clickup.png" alt="ClickUp" />,
  }),
  new EmbedDescriptor({
    title: "Codepen",
    keywords: "code editor",
    regexMatch: [new RegExp("^https://codepen.io/(.*?)/(pen|embed)/(.*)$")],
    transformMatch: (matches) =>
      `https://codepen.io/${matches[1]}/embed/${matches[3]}`,
    icon: <Img src="/images/codepen.png" alt="Codepen" />,
  }),
  new EmbedDescriptor({
    title: "DBDiagram",
    keywords: "diagrams database",
    regexMatch: [new RegExp("^https://dbdiagram.io/(embed|e|d)/(\\w+)(/.*)?$")],
    transformMatch: (matches) => `https://dbdiagram.io/embed/${matches[2]}`,
    icon: <Img src="/images/dbdiagram.png" alt="DBDiagram" />,
  }),
  new EmbedDescriptor({
    title: "Diagrams.net",
    name: IntegrationService.Diagrams,
    keywords: "diagrams drawio",
    regexMatch: [/^https:\/\/viewer\.diagrams\.net\/(?!proxy).*(title=\\w+)?/],
    icon: <Img src="/images/diagrams.png" alt="Diagrams.net" />,
    component: Diagrams,
  }),
  new EmbedDescriptor({
    title: "Descript",
    keywords: "audio",
    regexMatch: [new RegExp("^https?://share\\.descript\\.com/view/(\\w+)$")],
    transformMatch: (matches) =>
      `https://share.descript.com/embed/${matches[1]}`,
    icon: <Img src="/images/descript.png" alt="Descript" />,
  }),
  ...(env.DROPBOX_APP_KEY
    ? [
        new EmbedDescriptor({
          title: "Dropbox",
          keywords: "file document",
          regexMatch: [
            new RegExp("^https?://(www.)?dropbox.com/(s|scl)/(.*)$"),
          ],
          icon: <Img src="/images/dropbox.png" alt="Dropbox" />,
          component: Dropbox,
        }),
      ]
    : []),
  new EmbedDescriptor({
    title: "Figma",
    keywords: "design svg vector",
    regexMatch: [
      new RegExp(
        "^https://([w.-]+\\.)?figma\\.com/(file|proto|board|design)/([0-9a-zA-Z]{22,128})(?:/.*)?$"
      ),
      new RegExp("^https://([w.-]+\\.)?figma\\.com/embed(.*)$"),
    ],
    transformMatch: (matches) => {
      if (matches[0].includes("/embed")) {
        return matches[0];
      }

      return `https://www.figma.com/embed?embed_host=outline&url=${encodeURIComponent(
        matches[0]
      )}`;
    },
    icon: <Img src="/images/figma.png" alt="Figma" />,
  }),
  new EmbedDescriptor({
    title: "Framer",
    keywords: "design prototyping",
    regexMatch: [new RegExp("^https://framer.cloud/(.*)$")],
    transformMatch: (matches) => matches[0],
    icon: <Img src="/images/framer.png" alt="Framer" />,
  }),
  new EmbedDescriptor({
    title: "GitHub Gist",
    keywords: "code",
    regexMatch: [
      new RegExp(
        "^https://gist\\.github\\.com/([a-zA-Z\\d](?:[a-zA-Z\\d]|-(?=[a-zA-Z\\d])){0,38})/(.*)$"
      ),
    ],
    icon: <Img src="/images/github-gist.png" alt="GitHub" />,
    component: Gist,
  }),
  new EmbedDescriptor({
    title: "GitLab Snippet",
    keywords: "code",
    regexMatch: [
      new RegExp(`^https://gitlab\\.com/(([a-zA-Z\\d-]+)/)*-/snippets/\\d+$`),
    ],
    icon: <Img src="/images/gitlab.png" alt="GitLab" />,
    component: GitLabSnippet,
  }),
  new EmbedDescriptor({
    title: "Gliffy",
    keywords: "diagram",
    regexMatch: [new RegExp("https?://go\\.gliffy\\.com/go/share/(.*)$")],
    transformMatch: (matches: RegExpMatchArray) => matches[0],
    icon: <Img src="/images/gliffy.png" alt="Gliffy" />,
  }),
  new EmbedDescriptor({
    title: "Google Maps",
    keywords: "maps",
    regexMatch: [new RegExp("^https?://www\\.google\\.com/maps/embed\\?(.*)$")],
    transformMatch: (matches: RegExpMatchArray) => matches[0],
    icon: <Img src="/images/google-maps.png" alt="Google Maps" />,
  }),
  new EmbedDescriptor({
    title: "Google Drawings",
    keywords: "drawings",
    transformMatch: (matches: RegExpMatchArray) =>
      matches[0].replace("/edit", "/preview"),
    regexMatch: [
      new RegExp(
        "^https://docs\\.google\\.com/drawings/d/(.*)/(edit|preview)(.*)$"
      ),
    ],
    icon: <Img src="/images/google-drawings.png" alt="Google Drawings" />,
  }),
  new EmbedDescriptor({
    title: "Google Drive",
    keywords: "drive",
    regexMatch: [new RegExp("^https?://drive\\.google\\.com/file/d/(.*)$")],
    transformMatch: (matches) =>
      matches[0].replace("/view", "/preview").replace("/edit", "/preview"),
    icon: <Img src="/images/google-drive.png" alt="Google Drive" />,
  }),
  new EmbedDescriptor({
    title: "Google Docs",
    keywords: "documents word",
    regexMatch: [new RegExp("^https?://docs\\.google\\.com/document/(.*)$")],
    transformMatch: (matches) =>
      matches[0].replace("/view", "/preview").replace("/edit", "/preview"),
    icon: <Img src="/images/google-docs.png" alt="Google Docs" />,
  }),
  new EmbedDescriptor({
    title: "Google Sheets",
    keywords: "excel spreadsheet",
    regexMatch: [
      new RegExp("^https?://docs\\.google\\.com/spreadsheets/d/(.*)$"),
    ],
    transformMatch: (matches) =>
      matches[0].replace("/view", "/preview").replace("/edit", "/preview"),
    icon: <Img src="/images/google-sheets.png" alt="Google Sheets" />,
  }),
  new EmbedDescriptor({
    title: "Google Slides",
    keywords: "presentation slideshow",
    regexMatch: [
      new RegExp("^https?://docs\\.google\\.com/presentation/d/(.*)$"),
    ],
    transformMatch: (matches) =>
      matches[0].replace("/edit", "/preview").replace("/pub", "/embed"),
    icon: <Img src="/images/google-slides.png" alt="Google Slides" />,
  }),
  new EmbedDescriptor({
    title: "Google Calendar",
    keywords: "calendar",
    regexMatch: [
      new RegExp(
        "^https?://calendar\\.google\\.com/calendar/embed\\?src=(.*)$"
      ),
    ],
    transformMatch: (matches: RegExpMatchArray) => matches[0],
    icon: <Img src="/images/google-calendar.png" alt="Google Calendar" />,
  }),
  new EmbedDescriptor({
    title: "Google Forms",
    keywords: "form survey",
    regexMatch: [new RegExp("^https?://docs\\.google\\.com/forms/d/(.+)$")],
    transformMatch: (matches: RegExpMatchArray) =>
      matches[0].replace(
        /\/(edit|viewform)(\?.+)?$/,
        "/viewform?embedded=true"
      ),
    icon: <Img src="/images/google-forms.png" alt="Google Forms" />,
  }),
  new EmbedDescriptor({
    title: "Google Looker Studio",
    keywords: "bi business intelligence",
    regexMatch: [
      new RegExp(
        "^https?://(lookerstudio|datastudio)\\.google\\.com/(embed|u/0)/reporting/(.*)/page/(.*)(/edit)?$"
      ),
    ],
    transformMatch: (matches: RegExpMatchArray) =>
      matches[0].replace("u/0", "embed").replace("/edit", ""),
    icon: (
      <Img src="/images/google-lookerstudio.png" alt="Google Looker Studio" />
    ),
  }),
  new EmbedDescriptor({
    title: "Grist",
    name: IntegrationService.Grist,
    keywords: "spreadsheet",
    regexMatch: [new RegExp("^https?://([a-z.-]+\\.)?getgrist\\.com/(.+)$")],
    transformMatch: (matches: RegExpMatchArray) => {
      const input = matches.input ?? matches[0];

      try {
        const url = new URL(input);
        const params = new URLSearchParams(url.search);
        if (params.has("embed") || params.get("style") === "singlePage") {
          return input;
        }

        params.append("embed", "true");
        return `${url.origin}${url.pathname}?${params.toString()}`;
      } catch (e) {
        //
      }

      return input;
    },
    icon: <Img src="/images/grist.png" alt="Grist" />,
  }),
  new EmbedDescriptor({
    title: "Instagram",
    keywords: "post",
    regexMatch: [
      /^https?:\/\/www\.instagram\.com\/(p|reel)\/([\w-]+)(\/?utm_source=\w+)?/,
    ],
    transformMatch: (matches: RegExpMatchArray) => `${matches[0]}/embed`,
    icon: <Img src="/images/instagram.png" alt="Instagram" />,
  }),
  new EmbedDescriptor({
    title: "InVision",
    keywords: "design prototype",
    defaultHidden: true,
    regexMatch: [
      /^https:\/\/(invis\.io\/.*)|(projects\.invisionapp\.com\/share\/.*)$/,
      /^https:\/\/(opal\.invisionapp\.com\/static-signed\/live-embed\/.*)$/,
    ],
    icon: <Img src="/images/invision.png" alt="InVision" />,
    component: InVision,
  }),
  new EmbedDescriptor({
    title: "JSFiddle",
    keywords: "code",
    defaultHidden: true,
    regexMatch: [new RegExp("^https?://jsfiddle\\.net/(.*)/(.*)$")],
    icon: <Img src="/images/jsfiddle.png" alt="JSFiddle" />,
    component: JSFiddle,
  }),
  new EmbedDescriptor({
    title: "LinkedIn",
    keywords: "post",
    defaultHidden: true,
    regexMatch: [
      /^https:\/\/www\.linkedin\.com\/(?:posts\/.*-(ugcPost|activity)-(\d+)-.*|(embed)\/(?:feed\/update\/urn:li:(?:ugcPost|share):(?:\d+)))/,
    ],
    icon: <Img src="/images/linkedin.png" alt="LinkedIn" />,
    component: Linkedin,
  }),
  new EmbedDescriptor({
    title: "Loom",
    keywords: "video screencast",
    regexMatch: [/^https:\/\/(www\.)?(use)?loom\.com\/(embed|share)\/(.*)$/],
    transformMatch: (matches: RegExpMatchArray) =>
      matches[0].replace("share", "embed"),
    icon: <Img src="/images/loom.png" alt="Loom" />,
  }),
  new EmbedDescriptor({
    title: "Lucidchart",
    keywords: "chart",
    regexMatch: [
      /^https?:\/\/(www\.|app\.)?(lucidchart\.com|lucid\.app)\/documents\/(embeddedchart|view|edit)\/(?<chartId>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})(?:.*)?$/,
      /^https?:\/\/(www\.|app\.)?(lucid\.app|lucidchart\.com)\/lucidchart\/(?<chartId>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\/(embeddedchart|view|edit)(?:.*)?$/,
    ],
    transformMatch: (matches: RegExpMatchArray) =>
      `https://lucidchart.com/documents/embeddedchart/${matches.groups?.chartId}`,
    icon: <Img src="/images/lucidchart.png" alt="Lucidchart" />,
  }),
  new EmbedDescriptor({
    title: "Marvel",
    keywords: "design prototype",
    regexMatch: [new RegExp("^https://marvelapp\\.com/([A-Za-z0-9-]{6})/?$")],
    transformMatch: (matches: RegExpMatchArray) => matches[0],
    icon: <Img src="/images/marvel.png" alt="Marvel" />,
  }),
  new EmbedDescriptor({
    title: "Mindmeister",
    keywords: "mindmap",
    regexMatch: [
      new RegExp(
        "^https://([w.-]+\\.)?(mindmeister\\.com|mm\\.tt)(/maps/public_map_shell)?/(\\d+)(\\?t=.*)?(/.*)?$"
      ),
    ],
    transformMatch: (matches: RegExpMatchArray) => {
      const chartId = matches[4] + (matches[5] || "") + (matches[6] || "");
      return `https://www.mindmeister.com/maps/public_map_shell/${chartId}`;
    },
    icon: <Img src="/images/mindmeister.png" alt="Mindmeister" />,
  }),
  new EmbedDescriptor({
    title: "Miro",
    keywords: "whiteboard",
    regexMatch: [/^https:\/\/(realtimeboard|miro)\.com\/app\/board\/(.*)$/],
    transformMatch: (matches: RegExpMatchArray) =>
      `https://${matches[1]}.com/app/embed/${matches[2]}`,
    icon: <Img src="/images/miro.png" alt="Miro" />,
  }),
  new EmbedDescriptor({
    title: "Mode",
    keywords: "analytics",
    defaultHidden: true,
    regexMatch: [
      new RegExp("^https://([w.-]+\\.)?modeanalytics\\.com/(.*)/reports/(.*)$"),
    ],
    transformMatch: (matches: RegExpMatchArray) =>
      `${matches[0].replace(/\/embed$/, "")}/embed`,
    icon: <Img src="/images/mode-analytics.png" alt="Mode" />,
  }),
  new EmbedDescriptor({
    title: "Otter.ai",
    keywords: "audio transcription meeting notes",
    defaultHidden: true,
    regexMatch: [new RegExp("^https?://otter\\.ai/[su]/(.*)$")],
    transformMatch: (matches: RegExpMatchArray) => matches[0],
    icon: <Img src="/images/otter.png" alt="Otter.ai" />,
  }),
  new EmbedDescriptor({
    title: "Pitch",
    keywords: "presentation",
    defaultHidden: true,
    regexMatch: [
      new RegExp(
        "^https?://app\\.pitch\\.com/app/(?:presentation/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|public/player)/(.*)$"
      ),
      new RegExp("^https?://pitch\\.com/embed/(.*)$"),
    ],
    transformMatch: (matches: RegExpMatchArray) =>
      `https://pitch.com/embed/${matches[1]}`,
    icon: <Img src="/images/pitch.png" alt="Pitch" />,
  }),
  new EmbedDescriptor({
    title: "Prezi",
    keywords: "presentation",
    regexMatch: [new RegExp("^https://prezi\\.com/view/(.*)$")],
    transformMatch: (matches: RegExpMatchArray) =>
      `${matches[0].replace(/\/embed$/, "")}/embed`,
    icon: <Img src="/images/prezi.png" alt="Prezi" />,
  }),
  new EmbedDescriptor({
    title: "Scribe",
    keywords: "screencast",
    regexMatch: [/^https?:\/\/scribehow\.com\/shared\/(.*)$/],
    transformMatch: (matches: RegExpMatchArray) =>
      `https://scribehow.com/embed/${matches[1]}`,
    icon: <Img src="/images/scribe.png" alt="Scribe" />,
  }),
  new EmbedDescriptor({
    title: "SmartSuite",
    regexMatch: [
      new RegExp("^https?://app\\.smartsuite\\.com/shared/(.*)(?:\\?)?(?:.*)$"),
    ],
    icon: <Img src="/images/smartsuite.png" alt="SmartSuite" />,
    defaultHidden: true,
    hideToolbar: true,
    transformMatch: (matches: RegExpMatchArray) =>
      `https://app.smartsuite.com/shared/${matches[1]}?embed=true&header=false&toolbar=true`,
  }),
  new EmbedDescriptor({
    title: "Spotify",
    keywords: "music",
    regexMatch: [new RegExp("^https?://open\\.spotify\\.com/(.*)$")],
    icon: <Img src="/images/spotify.png" alt="Spotify" />,
    component: Spotify,
  }),
  new EmbedDescriptor({
    title: "Tldraw",
    keywords: "draw schematics diagrams",
    regexMatch: [
      new RegExp("^https?://(beta|www|old)\\.tldraw\\.com/[rsvopf]+/(.*)"),
    ],
    transformMatch: (matches: RegExpMatchArray) => matches[0],
    icon: <Img src="/images/tldraw.png" alt="Tldraw" />,
  }),
  new EmbedDescriptor({
    title: "Trello",
    keywords: "kanban",
    regexMatch: [/^https:\/\/trello\.com\/(c|b)\/([^/]*)(.*)?$/],
    icon: <Img src="/images/trello.png" alt="Trello" />,
    component: Trello,
  }),
  new EmbedDescriptor({
    title: "Typeform",
    keywords: "form survey",
    regexMatch: [
      new RegExp(
        "^https://([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)\\.typeform\\.com/to/(.*)$"
      ),
    ],
    transformMatch: (matches: RegExpMatchArray) => matches[0],
    icon: <Img src="/images/typeform.png" alt="Typeform" />,
  }),
  new EmbedDescriptor({
    title: "Valtown",
    keywords: "code",
    regexMatch: [/^https?:\/\/(?:www.)?val\.town\/(?:v|embed)\/(.*)$/],
    transformMatch: (matches: RegExpMatchArray) =>
      `https://www.val.town/embed/${matches[1]}`,
    icon: <Img src="/images/valtown.png" alt="Valtown" />,
  }),
  new EmbedDescriptor({
    title: "Vimeo",
    keywords: "video",
    regexMatch: [
      /(http|https)?:\/\/(www\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|)(\d+)(?:\/|\?)?([\d\w]+)?/,
    ],
    icon: <Img src="/images/vimeo.png" alt="Vimeo" />,
    component: Vimeo,
  }),
  new EmbedDescriptor({
    title: "Pinterest",
    keywords: "board moodboard pins",
    regexMatch: [
      // Match board URLs but exclude pins
      /^(?:https?:\/\/)?(?:(?:www\.|[a-z]{2}\.)?pinterest\.(?:com|[a-z]{2,3}))\/(?!pin\/)([^/]+)\/([^/]+)\/?$/,
      // Match profile URLs but exclude pins
      /^(?:https?:\/\/)?(?:(?:www\.|[a-z]{2}\.)?pinterest\.(?:com|[a-z]{2,3}))\/(?!pin\/)([^/]+)\/?$/,
    ],
    icon: <Img src="/images/pinterest.png" alt="Pinterest" />,
    component: Pinterest,
  }),
  new EmbedDescriptor({
    title: "Whimsical",
    keywords: "whiteboard",
    regexMatch: [
      /^https?:\/\/whimsical\.com\/[0-9a-zA-Z-_~]*-([a-zA-Z0-9]+)\/?$/,
    ],
    transformMatch: (matches: RegExpMatchArray) =>
      `https://whimsical.com/embed/${matches[1]}`,
    icon: <Img src="/images/whimsical.png" alt="Whimsical" />,
  }),
  new EmbedDescriptor({
    title: "YouTube",
    keywords: "google video",
    regexMatch: [
      /(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([a-zA-Z0-9_-]{11})([\&\?](.*))?$/i,
    ],
    icon: <Img src="/images/youtube.png" alt="YouTube" />,
    component: YouTube,
  }),
  /* The generic iframe embed should always be the last one */
  new EmbedDescriptor({
    title: "Embed",
    keywords: "iframe webpage",
    placeholder: "Paste a URL to embed",
    icon: <Img src="/images/embed.png" alt="Embed" />,
    defaultHidden: false,
    matchOnInput: false,
    regexMatch: [new RegExp("^https?://(.*)$")],
    transformMatch: (matches: RegExpMatchArray) => matches[0],
    hideToolbar: true,
  }),
];

export default embeds;
