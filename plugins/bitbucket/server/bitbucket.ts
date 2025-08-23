import axios, { AxiosInstance } from "axios";
import { UnfurlResourceType } from "@shared/types";
import { User } from "@server/models";
import { UnfurlIssueOrPR } from "@server/types";
import env from "./env";

interface BitbucketIssue {
  id: number;
  title: string;
  state: string;
  content: {
    raw: string;
    html: string;
  };
  created_on: string;
  updated_on: string;
  links: {
    html: {
      href: string;
    };
  };
  reporter: {
    display_name: string;
    nickname: string;
    links: {
      avatar: {
        href: string;
      };
    };
  };
  assignee?: {
    display_name: string;
    nickname: string;
    links: {
      avatar: {
        href: string;
      };
    };
  };
}

interface BitbucketPullRequest {
  id: number;
  title: string;
  state: string;
  description: string;
  draft: boolean;
  created_on: string;
  updated_on: string;
  links: {
    html: {
      href: string;
    };
  };
  author: {
    display_name: string;
    nickname: string;
    links: {
      avatar: {
        href: string;
      };
    };
  };
  assignee?: {
    display_name: string;
    nickname: string;
    links: {
      avatar: {
        href: string;
      };
    };
  };
  source: {
    branch: {
      name: string;
    };
  };
  destination: {
    branch: {
      name: string;
    };
  };
}

interface BitbucketRepository {
  name: string;
  full_name: string;
  links: {
    html: {
      href: string;
    };
  };
}

interface BitbucketWorkspace {
  name: string;
  slug: string;
  links: {
    avatar: {
      href: string;
    };
  };
}

interface BitbucketUser {
  display_name: string;
  nickname: string;
  links: {
    avatar: {
      href: string;
    };
  };
}

export class Bitbucket {
  private static client: AxiosInstance;

  static initialize() {
    if (!env.BITBUCKET_USERNAME || !env.BITBUCKET_APP_PASSWORD) {
      throw new Error("Bitbucket username and app password are required");
    }

    // Create base64 encoded credentials for Basic Auth
    const credentials = Buffer.from(
      `${env.BITBUCKET_USERNAME}:${env.BITBUCKET_APP_PASSWORD}`
    ).toString("base64");

    this.client = axios.create({
      baseURL: "https://api.bitbucket.org/2.0",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    return this;
  }

  static parseUrl(url: string): {
    type: UnfurlResourceType;
    owner: string;
    repo: string;
    id: string;
  } | null {
    const patterns = [
      // Issue: https://bitbucket.org/{owner}/{repo}/issues/{id}
      /^https?:\/\/bitbucket\.org\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/,
      // Pull Request: https://bitbucket.org/{owner}/{repo}/pull-requests/{id}
      /^https?:\/\/bitbucket\.org\/([^\/]+)\/([^\/]+)\/pull-requests\/(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const [, owner, repo, id] = match;
        const type = pattern.source.includes("issues")
          ? UnfurlResourceType.Issue
          : UnfurlResourceType.PR;
        return { type, owner, repo, id };
      }
    }

    return null;
  }

  static async unfurl(
    url: string,
    _user: User
  ): Promise<UnfurlIssueOrPR | null> {
    const resource = Bitbucket.parseUrl(url);
    if (!resource) {
      return null;
    }

    // Initialize the client if not already done
    if (!this.client) {
      this.initialize();
    }

    try {
      const response = await this.requestResource(resource);
      if (!response) {
        return null;
      }

      const { data } = response;
      const isPR = resource.type === UnfurlResourceType.PR;

      if (isPR) {
        const pr = data as BitbucketPullRequest;
        return {
          type: UnfurlResourceType.PR,
          id: pr.id.toString(),
          title: pr.title,
          description: null, // Remove description
          url: url, // Use the original URL
          author: {
            name: pr.author.display_name,
            avatarUrl: pr.author.links.avatar.href,
          },
          assignee: pr.assignee
            ? {
                name: pr.assignee.display_name,
                avatarUrl: pr.assignee.links.avatar.href,
              }
            : undefined,
          state: {
            name: pr.state,
            color: pr.state === "OPEN" ? "green" : "red",
            draft: pr.draft || false,
          },
          createdAt: pr.created_on,
          // Add source and target branch information
          sourceBranch: pr.source.branch.name,
          targetBranch: pr.destination.branch.name,
          // Add repository information
          repository: `${resource.owner}/${resource.repo}`,
        };
      } else {
        const issue = data as BitbucketIssue;
        return {
          type: UnfurlResourceType.Issue,
          id: issue.id.toString(),
          title: issue.title,
          description: null, // Remove description
          url: url, // Use the original URL
          author: {
            name: issue.reporter.display_name,
            avatarUrl: issue.reporter.links.avatar.href,
          },
          state: {
            name: issue.state,
            color: issue.state === "open" ? "green" : "red",
          },
          labels: [], // Bitbucket issues don't have labels in the same format
          createdAt: issue.created_on,
        };
      }
    } catch (_error) {
      return null;
    }
  }

  private static async requestResource(
    resource: ReturnType<typeof Bitbucket.parseUrl> | null
  ) {
    if (!resource) {
      return null;
    }

    try {
      const endpoint =
        resource.type === UnfurlResourceType.Issue
          ? `/repositories/${resource.owner}/${resource.repo}/issues/${resource.id}`
          : `/repositories/${resource.owner}/${resource.repo}/pullrequests/${resource.id}`;

      const response = await this.client.get(endpoint);

      return response;
    } catch (_error) {
      return null;
    }
  }

  static async getRepositories() {
    if (!this.client) {
      this.initialize();
    }

    try {
      const response = await this.client.get("/repositories");
      return response.data.values as BitbucketRepository[];
    } catch (_error) {
      return [];
    }
  }

  static async getWorkspaces() {
    if (!this.client) {
      this.initialize();
    }

    try {
      const response = await this.client.get("/workspaces");
      return response.data.values as BitbucketWorkspace[];
    } catch (_error) {
      return [];
    }
  }

  static async getUser() {
    if (!this.client) {
      this.initialize();
    }

    try {
      const response = await this.client.get("/user");
      return response.data as BitbucketUser;
    } catch (_error) {
      return null;
    }
  }
}
