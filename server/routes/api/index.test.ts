import { getTestServer } from "@server/test/support";

const server = getTestServer();

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

describe("PATCH unknown endpoint", () => {
  it("should be method not allowed", async () => {
    const res = await server.patch("/api/blah");
    expect(res.status).toEqual(405);
  });
});
