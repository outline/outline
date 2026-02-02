import { buildShare, buildDocument } from "@server/test/factories";
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
});
