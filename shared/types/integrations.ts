/** The categories of integration. */
export enum IntegrationType {
  /** An integration that posts updates to an external system. */
  Post = "post",
  /** An integration that listens for commands from an external system. */
  Command = "command",
  /** An integration that embeds content from an external system. */
  Embed = "embed",
  /** An integration that captures analytics data. */
  Analytics = "analytics",
  /** An integration that maps an Outline user to an external service. */
  LinkedAccount = "linkedAccount",
  /** An integration that imports documents into Outline. */
  Import = "import",
}

/** External services that Outline can integrate with. */
export enum IntegrationService {
  Diagrams = "diagrams",
  Grist = "grist",
  Slack = "slack",
  GoogleAnalytics = "google-analytics",
  Matomo = "matomo",
  Umami = "umami",
  GitHub = "github",
  GitLab = "gitlab",
  Linear = "linear",
  Figma = "figma",
  Notion = "notion",
  Markdown = "markdown",
  Slab = "slab",
  OKF = "okf",
  JSON = "json",
}

/** Integration services that import documents into Outline. */
export type ImportableIntegrationService = Extract<
  IntegrationService,
  | IntegrationService.Notion
  | IntegrationService.Markdown
  | IntegrationService.Slab
  | IntegrationService.OKF
  | IntegrationService.JSON
>;

/** Runtime values of `ImportableIntegrationService`. */
export const ImportableIntegrationService = {
  Notion: IntegrationService.Notion,
  Markdown: IntegrationService.Markdown,
  Slab: IntegrationService.Slab,
  OKF: IntegrationService.OKF,
  JSON: IntegrationService.JSON,
} as const;

/** Integration services that are issue trackers. */
export type IssueTrackerIntegrationService = Extract<
  IntegrationService,
  | IntegrationService.GitHub
  | IntegrationService.GitLab
  | IntegrationService.Linear
>;

/** Runtime values of `IssueTrackerIntegrationService`. */
export const IssueTrackerIntegrationService = {
  GitHub: IntegrationService.GitHub,
  GitLab: IntegrationService.GitLab,
  Linear: IntegrationService.Linear,
} as const;

/** Integration services that can be created through the API. */
export type UserCreatableIntegrationService = Extract<
  IntegrationService,
  | IntegrationService.Diagrams
  | IntegrationService.Grist
  | IntegrationService.GoogleAnalytics
  | IntegrationService.Matomo
  | IntegrationService.Umami
  | IntegrationService.GitLab
>;

/** Runtime values of `UserCreatableIntegrationService`. */
export const UserCreatableIntegrationService = {
  Diagrams: IntegrationService.Diagrams,
  Grist: IntegrationService.Grist,
  GoogleAnalytics: IntegrationService.GoogleAnalytics,
  Matomo: IntegrationService.Matomo,
  Umami: IntegrationService.Umami,
  GitLab: IntegrationService.GitLab,
} as const;

/** The settings stored on an integration, by integration type. */
export type IntegrationSettings<T> = T extends IntegrationType.Embed
  ? {
      url?: string;
      github?: {
        installation: {
          id: number;
          account: { id: number; name: string; avatarUrl: string };
        };
      };
      gitlab?: {
        url?: string;
        installation?: {
          id: number;
          account: { id: number; name: string; avatarUrl: string };
        };
      };
      linear?: {
        workspace: { id: string; name: string; key: string; logoUrl?: string };
      };
      diagrams?: {
        url: string;
      };
    }
  : T extends IntegrationType.Analytics
    ? { measurementId: string; instanceUrl?: string; scriptName?: string }
    : T extends IntegrationType.Post
      ? { url: string; channel: string; channelId: string }
      : T extends IntegrationType.Command
        ? { serviceTeamId: string }
        : T extends IntegrationType.Import
          ? {
              externalWorkspace: { id: string; name: string; iconUrl?: string };
            }
          : T extends IntegrationType.LinkedAccount
            ? {
                slack?: { serviceTeamId: string; serviceUserId: string };
                figma?: {
                  account: {
                    id: string;
                    name: string;
                    email: string;
                    avatarUrl: string;
                  };
                };
              }
            :
                | { url: string }
                | {
                    github?: {
                      installation: {
                        id: number;
                        account: {
                          id?: number;
                          name: string;
                          avatarUrl?: string;
                        };
                      };
                    };
                    gitlab?: {
                      url?: string;
                      installation?: {
                        id: number;
                        account: {
                          id?: number;
                          name: string;
                          avatarUrl?: string;
                        };
                      };
                    };
                    diagrams?: {
                      url: string;
                    };
                  }
                | { serviceTeamId: string }
                | {
                    measurementId: string;
                    instanceUrl?: string;
                    scriptName?: string;
                  }
                | undefined;

/** Environment values that the server exposes to the client. */
export type PublicEnv = {
  /** ID of the share mounted at the root of a custom domain, if any. */
  ROOT_SHARE_ID?: string;
  /** Whether the page is a publicly shared view. */
  isShare?: boolean;
  analytics: {
    service: IntegrationService;
    settings: IntegrationSettings<IntegrationType.Analytics>;
  }[];
};
