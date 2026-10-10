/** The kinds of resource that a mention can refer to. */
export enum MentionType {
  User = "user",
  Document = "document",
  Collection = "collection",
  Group = "group",
  Issue = "issue",
  PullRequest = "pull_request",
  Project = "project",
  URL = "url",
  Date = "date",
}

/** The kinds of resource that a link can unfurl to. */
export enum UnfurlResourceType {
  URL = "url",
  Mention = "mention",
  Group = "group",
  Document = "document",
  Issue = "issue",
  PR = "pull",
  Project = "project",
}

/** The unfurl response shape for each resource type. */
export type UnfurlResponse = {
  [UnfurlResourceType.URL]: {
    /** The resource type */
    type: UnfurlResourceType.URL;
    /** URL pointing to the resource */
    url: string;
    /** A text title, describing the resource */
    title: string;
    /** A color representing the resource */
    color?: string;
    /** A brief description about the resource */
    description: string;
    /** A URL to a thumbnail image representing the resource */
    thumbnailUrl: string;
    /** A URL to a favicon representing the resource */
    faviconUrl: string;
  };
  [UnfurlResourceType.Mention]: {
    /** The resource type */
    type: UnfurlResourceType.Mention;
    /** Mentioned user's name */
    name: string;
    /** Mentioned user's email */
    email: string | null;
    /** Mentioned user's avatar URL */
    avatarUrl: string | null;
    /** Used to create mentioned user's avatar if no avatar URL provided */
    color: string;
    /** Mentiond user's recent activity */
    lastActive: string;
  };
  [UnfurlResourceType.Group]: {
    /** The resource type */
    type: UnfurlResourceType.Group;
    /** Group name */
    name: string;
    /** Group description */
    description: string | null;
    /** Number of members in the group */
    memberCount: number;
    /** Array of group members (limited to display count) */
    users: Array<{
      id: string;
      name: string;
      avatarUrl: string | null;
      color: string;
    }>;
  };
  [UnfurlResourceType.Document]: {
    /** The resource type */
    type: UnfurlResourceType.Document;
    /** URL pointing to the resource */
    url: string;
    /** Document id */
    id: string;
    /** Document title */
    title: string;
    /** Document summary */
    summary: string;
    /** Viewer's last activity on this document */
    lastActivityByViewer?: string;
  };
  [UnfurlResourceType.Issue]: {
    /** The resource type */
    type: UnfurlResourceType.Issue;
    /** Issue link */
    url: string;
    /** Issue identifier */
    id: string;
    /** Issue title */
    title: string;
    /** Issue description */
    description: string | null;
    /** Issue's author */
    author: { name: string; avatarUrl: string };
    /** Issue's labels */
    labels: Array<{ name: string; color: string }>;
    /** Issue's status */
    state: {
      type?: string;
      name: string;
      color: string;
      completionPercentage?: number;
    };
    /** Issue's creation time */
    createdAt: string;
  };
  [UnfurlResourceType.PR]: {
    /** The resource type */
    type: UnfurlResourceType.PR;
    /** Pull Request link */
    url: string;
    /** Pull Request identifier */
    id: string;
    /** Pull Request title */
    title: string;
    /** Pull Request description */
    description: string | null;
    /** Pull Request author */
    author: { name: string; avatarUrl: string };
    /** Pull Request status */
    state: { name: string; color: string; draft?: boolean };
    /** Pull Request creation time */
    createdAt: string;
  };
  [UnfurlResourceType.Project]: {
    /** The resource type */
    type: UnfurlResourceType.Project;
    /** Project link */
    url: string;
    /** Project identifier */
    id: string;
    /** Project name */
    name: string;
    /** Project color */
    color: string;
    /** Project avatar URL */
    avatarUrl?: string;
    /** Project description */
    description: string | null;
    /** Project lead */
    lead: { name: string; avatarUrl: string } | null;
    /** Project state */
    state: {
      name: string;
      color: string;
      type: string;
    };
    /** Project labels */
    labels: Array<{ name: string; color: string }>;
    /** Project progress (0-1) */
    progress?: number;
    /** Project creation time */
    createdAt: string;
    /** Project target date */
    targetDate: string | null;
  };
};
