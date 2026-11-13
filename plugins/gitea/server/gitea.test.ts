import { addHours } from "date-fns";
import {
  IntegrationService,
  IntegrationType,
  UnfurlResourceType,
} from "@shared/types";
import { Integration, IntegrationAuthentication } from "@server/models";
import { buildUser } from "@server/test/factories";
import { GiteaIssueProvider } from "./GiteaIssueProvider";
import { Gitea } from "./gitea";

const installation = {
  id: 1,
  account: { id: 1, name: "octo", avatarUrl: "" },
};

const author = { id: 7, login: "octo", avatar_url: "https://a.test/a.png" };

async function buildGiteaIntegration({
  teamId,
  userId,
  url,
  connected = true,
}: {
  teamId: string;
  userId: string;
  url: string;
  connected?: boolean;
}) {
  const authentication = await IntegrationAuthentication.create({
    service: IntegrationService.Gitea,
    userId,
    teamId,
    clientId: "id",
    clientSecret: "secret",
    ...(connected
      ? {
          token: "token",
          refreshToken: "refresh",
          expiresAt: addHours(new Date(), 1),
        }
      : {}),
  });

  return Integration.create({
    service: IntegrationService.Gitea,
    type: IntegrationType.Embed,
    userId,
    teamId,
    authenticationId: authentication.id,
    settings: { gitea: { url, ...(connected ? { installation } : {}) } },
  });
}

describe("Gitea.unfurl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should unfurl an issue from an instance served from a sub-path", async () => {
    const user = await buildUser();
    await buildGiteaIntegration({
      teamId: user.teamId,
      userId: user.id,
      url: "https://example.com/gitea",
    });
    const getIssue = vi.spyOn(Gitea, "getIssue").mockResolvedValue({
      number: 12,
      title: "Fix it",
      body: "Details",
      html_url: "https://example.com/gitea/owner/repo/issues/12",
      state: "open",
      user: author,
      labels: [{ name: "bug", color: "e11d21" }],
      created_at: "2026-01-01T00:00:00Z",
    });

    const result = await Gitea.unfurl(
      "https://example.com/gitea/owner/repo/issues/12",
      user
    );

    expect(getIssue).toHaveBeenCalledWith({
      baseUrl: "https://example.com/gitea",
      accessToken: "token",
      owner: "owner",
      repo: "repo",
      id: 12,
    });
    expect(result).toMatchObject({
      type: UnfurlResourceType.Issue,
      id: "#12",
      title: "Fix it",
      labels: [{ name: "bug", color: "#e11d21" }],
      state: { name: "open" },
    });
  });

  it("should unfurl a merged pull request", async () => {
    const user = await buildUser();
    await buildGiteaIntegration({
      teamId: user.teamId,
      userId: user.id,
      url: "https://gitea.example.com",
    });
    vi.spyOn(Gitea, "getPullRequest").mockResolvedValue({
      number: 3,
      title: "Add feature",
      body: null,
      html_url: "https://gitea.example.com/owner/repo/pulls/3",
      state: "closed",
      merged: true,
      draft: false,
      user: author,
      created_at: "2026-01-01T00:00:00Z",
    });

    const result = await Gitea.unfurl(
      "https://gitea.example.com/owner/repo/pulls/3",
      user
    );

    expect(result).toMatchObject({
      type: UnfurlResourceType.PR,
      id: "#3",
      state: { name: "merged", draft: false },
    });
  });

  it("should unfurl a repository with issue progress", async () => {
    const user = await buildUser();
    await buildGiteaIntegration({
      teamId: user.teamId,
      userId: user.id,
      url: "https://gitea.example.com",
    });
    vi.spyOn(Gitea, "getRepository").mockResolvedValue({
      repository: {
        id: 5,
        name: "repo",
        full_name: "owner/repo",
        description: "A repository",
        html_url: "https://gitea.example.com/owner/repo",
        private: true,
        owner: author,
        topics: ["docs"],
        open_issues_count: 1,
        created_at: "2026-01-01T00:00:00Z",
      },
      closedIssues: 3,
    });

    const result = await Gitea.unfurl(
      "https://gitea.example.com/owner/repo",
      user
    );

    expect(result).toMatchObject({
      type: UnfurlResourceType.Project,
      name: "repo",
      progress: 0.75,
      state: { type: "private" },
      labels: [{ name: "docs" }],
    });
  });

  it("should not unfurl urls for another team's instance", async () => {
    const user = await buildUser();
    const other = await buildUser();
    await buildGiteaIntegration({
      teamId: other.teamId,
      userId: other.id,
      url: "https://gitea.example.com",
    });
    const getIssue = vi.spyOn(Gitea, "getIssue");

    const result = await Gitea.unfurl(
      "https://gitea.example.com/owner/repo/issues/1",
      user
    );

    expect(result).toBeUndefined();
    expect(getIssue).not.toHaveBeenCalled();
  });

  it("should not unfurl urls with a connection that is not authorized", async () => {
    const user = await buildUser();
    await buildGiteaIntegration({
      teamId: user.teamId,
      userId: user.id,
      url: "https://gitea.example.com",
      connected: false,
    });
    const getIssue = vi.spyOn(Gitea, "getIssue");

    const result = await Gitea.unfurl(
      "https://gitea.example.com/owner/repo/issues/1",
      user
    );

    expect(result).toBeUndefined();
    expect(getIssue).not.toHaveBeenCalled();
  });

  it("should refresh an expired token with the stored credentials", async () => {
    const user = await buildUser();
    const integration = await buildGiteaIntegration({
      teamId: user.teamId,
      userId: user.id,
      url: "https://gitea.example.com",
    });
    await IntegrationAuthentication.update(
      { expiresAt: new Date(Date.now() - 1000) },
      { where: { id: integration.authenticationId } }
    );
    const refreshToken = vi.spyOn(Gitea, "refreshToken").mockResolvedValue({
      access_token: "new-token",
      refresh_token: "new-refresh",
      token_type: "bearer",
      expires_in: 3600,
    });
    const getIssue = vi
      .spyOn(Gitea, "getIssue")
      .mockRejectedValue(new Error("Not found"));

    await Gitea.unfurl("https://gitea.example.com/owner/repo/issues/1", user);

    expect(refreshToken).toHaveBeenCalledWith({
      baseUrl: "https://gitea.example.com",
      refreshToken: "refresh",
      clientId: "id",
      clientSecret: "secret",
    });
    expect(getIssue).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "new-token" })
    );

    const authentication = await IntegrationAuthentication.findByPk(
      integration.authenticationId
    );
    expect(authentication?.token).toEqual("new-token");
    expect(authentication?.refreshToken).toEqual("new-refresh");
  });

  it("should return an error when the request fails", async () => {
    const user = await buildUser();
    await buildGiteaIntegration({
      teamId: user.teamId,
      userId: user.id,
      url: "https://gitea.example.com",
    });
    vi.spyOn(Gitea, "getIssue").mockRejectedValue(new Error("Not found"));

    const result = await Gitea.unfurl(
      "https://gitea.example.com/owner/repo/issues/1",
      user
    );

    expect(result).toEqual({ error: "Not found" });
  });
});

describe("GiteaIssueProvider.fetchSources", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should refresh an expired token before fetching repositories", async () => {
    const user = await buildUser();
    const integration = await buildGiteaIntegration({
      teamId: user.teamId,
      userId: user.id,
      url: "https://gitea.example.com",
    });
    await IntegrationAuthentication.update(
      { expiresAt: new Date(Date.now() - 1000) },
      { where: { id: integration.authenticationId } }
    );
    vi.spyOn(Gitea, "refreshToken").mockResolvedValue({
      access_token: "new-token",
      refresh_token: "new-refresh",
      token_type: "bearer",
      expires_in: 3600,
    });
    const getRepositories = vi
      .spyOn(Gitea, "getRepositories")
      .mockResolvedValue([]);

    await new GiteaIssueProvider().fetchSources(integration);

    expect(getRepositories).toHaveBeenCalledWith({
      baseUrl: "https://gitea.example.com",
      accessToken: "new-token",
    });
  });
});
