// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module 'fetc... Remove this comment to see the full error message
import TestServer from "fetch-test-server";
import webService from "@server/services/web";
import { flushdb } from "@server/test/support";

const app = webService();
const server = new TestServer(app.callback());
beforeEach(() => flushdb());
afterAll(() => server.close());

describe("POST unknown endpoint", () => {
  it("should be not found", async () => {
    const res = await server.post("/api/blah");
    expect(res.status).toEqual(404);
  });
});

describe("GET unknown endpoint", () => {
  it("should be not found", async () => {
    const res = await server.get("/api/blah");
    expect(res.status).toEqual(404);
  });
});
