import { getTestServer } from "@server/test/support";

const server = getTestServer();

afterAll(server.disconnect);

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
