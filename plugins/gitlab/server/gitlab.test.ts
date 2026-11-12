import { randomUUID } from "node:crypto";
import { addHours, subHours } from "date-fns";
import { http, HttpResponse } from "msw";
import { IntegrationService, IntegrationType } from "@shared/types";
import { Integration, IntegrationAuthentication } from "@server/models";
import { buildUser } from "@server/test/factories";
import { server } from "@server/test/msw";
import { GitLab } from "./gitlab";

const author = { id: 7, username: "octo", avatar_url: "https://a.test/a.png" };

const buildBaseUrl = () => `https://${randomUUID()}.example.com`;

async function buildGitLabIntegration({
  teamId,
  userId,
  url,
  expiresAt = addHours(new Date(), 1),
}: {
  teamId: string;
  userId: string;
  url: string;
  expiresAt?: Date;
}) {
  const authentication = await IntegrationAuthentication.create({
    service: IntegrationService.GitLab,
    userId,
    teamId,
    clientId: "client-id",
    clientSecret: "client-secret",
    token: "token",
    refreshToken: "refresh",
    expiresAt,
  });

  const integration = await Integration.create({
    service: IntegrationService.GitLab,
    type: IntegrationType.Embed,
    userId,
    teamId,
    authenticationId: authentication.id,
    settings: { gitlab: { url } },
  });
  return { integration, authentication };
}

describe("GitLab", () => {
  describe("getIssue", () => {
    it("should request the issue with an encoded project path", async () => {
      const customUrl = buildBaseUrl();
      let requestUrl: URL | undefined;
      let authorization: string | null = null;
      server.use(
        http.get(
          `${customUrl}/api/v4/projects/:project/issues`,
          ({ request }) => {
            requestUrl = new URL(request.url);
            authorization = request.headers.get("authorization");
            return HttpResponse.json([
              {
                iid: 12,
                title: "Fix it",
                description: "Details",
                web_url: `${customUrl}/group/repo/-/issues/12`,
                state: "opened",
                author,
                labels: [{ name: "bug", color: "#ff0000" }],
                created_at: "2026-01-01T00:00:00Z",
              },
            ]);
          }
        )
      );

      const issue = await GitLab.getIssue({
        accessToken: "token",
        customUrl,
        path: "group/repo",
        id: 12,
      });

      expect(issue.title).toEqual("Fix it");
      expect(requestUrl?.pathname).toEqual(
        "/api/v4/projects/group%2Frepo/issues"
      );
      expect(requestUrl?.searchParams.get("iids[]")).toEqual("12");
      expect(authorization).toEqual("Bearer token");
    });
  });

  describe("getProjects", () => {
    it("should follow pagination", async () => {
      const user = await buildUser();
      const pages: (string | null)[] = [];
      server.use(
        http.get("https://gitlab.com/api/v4/projects", ({ request }) => {
          const page = new URL(request.url).searchParams.get("page");
          pages.push(page);
          return HttpResponse.json(
            [
              {
                id: Number(page),
                name: `project-${page}`,
                namespace: { id: 1, full_path: "group" },
              },
            ],
            { headers: { "x-next-page": page === "1" ? "2" : "" } }
          );
        })
      );

      const projects = await GitLab.getProjects({
        accessToken: "token",
        teamId: user.teamId,
      });

      expect(pages).toEqual(["1", "2"]);
      expect(projects.map((project) => project.name)).toEqual([
        "project-1",
        "project-2",
      ]);
    });
  });

  describe("unfurl", () => {
    it("should refresh an expired token and use the new token", async () => {
      const user = await buildUser();
      const customUrl = buildBaseUrl();
      const { authentication } = await buildGitLabIntegration({
        teamId: user.teamId,
        userId: user.id,
        url: customUrl,
        expiresAt: subHours(new Date(), 1),
      });
      let tokenRequest: Record<string, string> | undefined;
      let authorization: string | null = null;
      server.use(
        http.post(`${customUrl}/oauth/token`, async ({ request }) => {
          tokenRequest = (await request.json()) as Record<string, string>;
          return HttpResponse.json({
            access_token: "new-token",
            token_type: "Bearer",
            expires_in: 7200,
            refresh_token: "new-refresh",
            scope: "read_api read_user",
            created_at: 0,
          });
        }),
        http.get(
          `${customUrl}/api/v4/projects/:project/merge_requests/5`,
          ({ request }) => {
            authorization = request.headers.get("authorization");
            return HttpResponse.json({
              iid: 5,
              title: "Change",
              web_url: `${customUrl}/group/repo/-/merge_requests/5`,
              state: "opened",
              author,
              created_at: "2026-01-01T00:00:00Z",
            });
          }
        )
      );

      const result = await GitLab.unfurl(
        `${customUrl}/group/repo/-/merge_requests/5`,
        user
      );

      expect(result).toMatchObject({ title: "Change" });
      expect(tokenRequest).toMatchObject({
        grant_type: "refresh_token",
        refresh_token: "refresh",
        client_id: "client-id",
        client_secret: "client-secret",
      });
      expect(authorization).toEqual("Bearer new-token");

      await authentication.reload();
      expect(authentication.token).toEqual("new-token");
      expect(authentication.refreshToken).toEqual("new-refresh");
    });

    it("should unfurl a project without progress when statistics fail", async () => {
      const user = await buildUser();
      const customUrl = buildBaseUrl();
      await buildGitLabIntegration({
        teamId: user.teamId,
        userId: user.id,
        url: customUrl,
      });
      server.use(
        http.get(`${customUrl}/api/v4/projects/:project`, () =>
          HttpResponse.json({
            id: 1,
            name: "repo",
            web_url: `${customUrl}/group/repo`,
            visibility: "public",
            created_at: "2026-01-01T00:00:00Z",
          })
        ),
        http.get(
          `${customUrl}/api/v4/projects/:project/issues_statistics`,
          () => HttpResponse.json({}, { status: 500 })
        )
      );

      const result = await GitLab.unfurl(`${customUrl}/group/repo`, user);

      expect(result).toMatchObject({ name: "repo", progress: undefined });
    });

    it("should not return the response body of a failed request", async () => {
      const user = await buildUser();
      const customUrl = buildBaseUrl();
      await buildGitLabIntegration({
        teamId: user.teamId,
        userId: user.id,
        url: customUrl,
      });
      server.use(
        http.get(`${customUrl}/api/v4/projects/:project/merge_requests/5`, () =>
          HttpResponse.json({ message: "secret" }, { status: 500 })
        )
      );

      const result = await GitLab.unfurl(
        `${customUrl}/group/repo/-/merge_requests/5`,
        user
      );

      expect(result).toEqual({
        error:
          "Error while requesting /projects/group%2Frepo/merge_requests/5 from GitLab; status: 500",
      });
    });
  });
});
