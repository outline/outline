import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("/test/error", () => {
  it("should return error response as json", async () => {
    const res = await server.post("/test/error", {
      body: {},
    });
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.message).toBe("Internal error");
  });

  it("should return error response as html", async () => {
    const res = await server.post("/test/error", {
      headers: {
        accept: "text/html",
      },
      body: {},
    });
    const body = await res.text();
    expect(res.status).toBe(500);
    expect(body).toContain("<title>Error - 500</title>");
  });

  it("should fallback to json err response for types other than html", async () => {
    const res = await server.post("/test/error", {
      headers: {
        accept: "text/plain",
      },
      body: {},
    });
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.message).toBe("Internal error");
  });
});
