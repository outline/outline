import { IntegrationService, IntegrationType } from "@shared/types";
import env from "@server/env";
import {
  buildShare,
  buildDocument,
  buildIntegration,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("/s/:id", () => {
  it("should return standard title in html when loading unpublished share", async () => {
    const share = await buildShare({
      published: false,
    });
    const res = await server.get(`/s/${share.id}`);
    const body = await res.text();
    expect(res.status).toEqual(404);
    expect(body).toContain("<title>Outline</title>");
  });

  it("should return standard title in html when share does not exist", async () => {
    const res = await server.get(`/s/junk`);
    const body = await res.text();
    expect(res.status).toEqual(404);
    expect(body).toContain("<title>Outline</title>");
  });

  it("should return standard title in html when document is deleted", async () => {
    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await document.destroy();
    const res = await server.get(`/s/${share.id}`);
    const body = await res.text();
    expect(res.status).toEqual(404);
    expect(body).toContain("<title>Outline</title>");
  });

  it("should return document title in html when loading published share", async () => {
    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    const res = await server.get(`/s/${share.id}`);
    const body = await res.text();
    expect(res.status).toEqual(200);
    expect(body).toContain(`<title>${document.title}</title>`);
  });

  it("should return document title in html when loading published share with nested doc route", async () => {
    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    const res = await server.get(`/s/${share.id}/doc/${document.urlId}`);
    const body = await res.text();
    expect(res.status).toEqual(200);
    expect(body).toContain(`<title>${document.title}</title>`);
  });

  it("should return markdown when Accept header prefers text/markdown", async () => {
    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    const res = await server.get(`/s/${share.id}`, {
      headers: { Accept: "text/markdown" },
    });
    const body = await res.text();
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(body).toContain(`# ${document.title}`);
  });

  it("should return markdown when URL path ends with .md", async () => {
    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    const res = await server.get(`/s/${share.id}.md`);
    const body = await res.text();
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(body).toContain(`# ${document.title}`);
  });

  it("should return html when Accept header prefers text/html over text/markdown", async () => {
    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    const res = await server.get(`/s/${share.id}`, {
      headers: { Accept: "text/html, text/markdown" },
    });
    const body = await res.text();
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(body).toContain(`<title>${document.title}</title>`);
  });

  it("should include child documents list in markdown when includeChildDocuments is true", async () => {
    const parent = await buildDocument();
    const child1 = await buildDocument({
      teamId: parent.teamId,
      collectionId: parent.collectionId,
      parentDocumentId: parent.id,
      title: "Child Document 1",
    });
    const child2 = await buildDocument({
      teamId: parent.teamId,
      collectionId: parent.collectionId,
      parentDocumentId: parent.id,
      title: "Child Document 2",
    });

    const share = await buildShare({
      documentId: parent.id,
      teamId: parent.teamId,
      includeChildDocuments: true,
    });

    const res = await server.get(`/s/${share.id}`, {
      headers: { Accept: "text/markdown" },
    });
    const body = await res.text();

    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(body).toContain(`# ${parent.title}`);
    expect(body).toContain("---");
    expect(body).toContain("**Documents**");
    expect(body).toContain(`[${child1.title}]`);
    expect(body).toContain(`[${child2.title}]`);
  });

  it("should not include child documents list in markdown when includeChildDocuments is false", async () => {
    const parent = await buildDocument();
    await buildDocument({
      teamId: parent.teamId,
      collectionId: parent.collectionId,
      parentDocumentId: parent.id,
      title: "Child Document",
    });

    const share = await buildShare({
      documentId: parent.id,
      teamId: parent.teamId,
      includeChildDocuments: false,
    });

    const res = await server.get(`/s/${share.id}`, {
      headers: { Accept: "text/markdown" },
    });
    const body = await res.text();

    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(body).toContain(`# ${parent.title}`);
    expect(body).not.toContain("**Documents**");
    expect(body).not.toContain("[Child Document]");
  });
});

describe("content security policy", () => {
  // Analytics integrations only extend the policy on self-hosted installations,
  // the cloud policy already includes these sources.
  beforeEach(() => {
    env.URL = "https://outline.example.com";
  });

  it.each([
    [
      "gitlab",
      "https://gitlab.com/gitlab-org/gitlab/-/snippets/1",
      "gitlab.com",
    ],
    ["github", "https://gist.github.com/user/abc123", "gist.github.com"],
    ["dropbox", "https://www.dropbox.com/s/abc123/file.pdf", "www.dropbox.com"],
    ["pinterest", "https://pinterest.com/user", "assets.pinterest.com"],
  ])("should allow the %s embed script source", async (path, url, source) => {
    const res = await server.get(
      `/embeds/${path}?url=${encodeURIComponent(url)}`
    );
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(res.status).toEqual(200);
    expect(csp).toContain(source);
    expect(csp).toContain("nonce-");
  });

  it("should still send a policy for responses that do not render the app", async () => {
    const res = await server.get(`/s/junk`);
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(res.status).toEqual(404);
    expect(csp).toContain("script-src");
    expect(csp).toContain("nonce-");
  });

  it("should allow the Google Tag Manager script source when integration is enabled", async () => {
    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await buildIntegration({
      teamId: document.teamId,
      type: IntegrationType.Analytics,
      service: IntegrationService.GoogleAnalytics,
      settings: { measurementId: "G-TEST123456" },
    });

    const res = await server.get(`/s/${share.id}`);
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(res.status).toEqual(200);
    expect(csp).toContain("www.googletagmanager.com");
    expect(csp).toContain(`nonce-`);
    expect(csp).not.toContain("'unsafe-inline'; script-src");
  });

  it("should not allow the Google Tag Manager script source without integration", async () => {
    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });

    const res = await server.get(`/s/${share.id}`);
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(res.status).toEqual(200);
    expect(csp).not.toContain("www.googletagmanager.com");
  });

  it("should allow the instance host for self-hosted analytics integrations", async () => {
    const document = await buildDocument();
    const share = await buildShare({
      documentId: document.id,
      teamId: document.teamId,
    });
    await buildIntegration({
      teamId: document.teamId,
      type: IntegrationType.Analytics,
      service: IntegrationService.Matomo,
      settings: {
        measurementId: "1",
        instanceUrl: "https://matomo.example.com/",
      },
    });

    const res = await server.get(`/s/${share.id}`);
    const csp = res.headers.get("content-security-policy") ?? "";
    expect(res.status).toEqual(200);
    expect(csp).toContain("matomo.example.com");
  });
});

describe("scanner path 404s", () => {
  it.each([
    "/.well-known/gpc.json",
    "/.env",
    "/.git/config",
    "/cgi-bin/test.cgi",
    "/wp-admin/setup-config.php",
    "/wp-login.php",
    "/xmlrpc.php",
    "/admin.php",
    "/phpmyadmin/index.php",
    "/actuator/health",
    "/HNAP1/",
  ])("returns 404 for %s without rendering the app shell", async (path) => {
    const res = await server.get(path);
    const body = await res.text();
    expect(res.status).toEqual(404);
    expect(body).not.toContain("<title>");
  });

  it("still serves the app shell for legitimate unknown paths", async () => {
    const res = await server.get("/some-app-route");
    expect(res.status).toEqual(200);
  });

  it("still serves the OAuth well-known endpoint", async () => {
    const res = await server.get("/.well-known/oauth-authorization-server");
    expect(res.status).toEqual(200);
    const body = await res.json();
    expect(body.issuer).toBeDefined();
  });
});
