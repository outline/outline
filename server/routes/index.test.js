// @flow
import TestServer from "fetch-test-server";
import webService from "../services/web";
import { buildShare, buildDocument } from "../test/factories";
import { flushdb } from "../test/support";

const app = webService();
const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("/share/:id", () => {
  it("should return standard title in html when loading share", async () => {
    const share = await buildShare({ published: false });

    const res = await server.get(`/share/${share.id}`);
    const body = await res.text();

    expect(res.status).toEqual(200);
    expect(body).toContain("<title>Outline</title>");
  });

  it("should return standard title in html when share does not exist", async () => {
    const res = await server.get(`/share/junk`);
    const body = await res.text();

    expect(res.status).toEqual(200);
    expect(body).toContain("<title>Outline</title>");
  });

  it("should return standard title in html when document is deleted", async () => {
    const document = await buildDocument();
    const share = await buildShare({ documentId: document.id });

    await document.destroy();

    const res = await server.get(`/share/${share.id}`);
    const body = await res.text();

    expect(res.status).toEqual(200);
    expect(body).toContain("<title>Outline</title>");
  });

  it("should return document title in html when loading published share", async () => {
    const document = await buildDocument();
    const share = await buildShare({ documentId: document.id });

    const res = await server.get(`/share/${share.id}`);
    const body = await res.text();

    expect(res.status).toEqual(200);
    expect(body).toContain(`<title>${document.title}</title>`);
  });

  it("should return document title in html when loading published share with nested doc route", async () => {
    const document = await buildDocument();
    const share = await buildShare({ documentId: document.id });

    const res = await server.get(`/share/${share.id}/doc/test-Cl6g1AgPYn`);
    const body = await res.text();

    expect(res.status).toEqual(200);
    expect(body).toContain(`<title>${document.title}</title>`);
  });
});
