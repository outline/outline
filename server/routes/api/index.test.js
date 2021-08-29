/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from "fetch-test-server";
import webService from "../../services/web";
import { flushdb } from "../../test/support";
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
