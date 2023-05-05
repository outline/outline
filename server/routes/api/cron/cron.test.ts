import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("POST /api/cron.daily", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/cron.daily");
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toBe("token is required");
  });

  it("should validate token", async () => {
    const res = await server.post("/api/cron.daily", {
      body: {
        token: "token",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toBe("invalid token");
  });
});

describe("GET /api/cron.daily", () => {
  it("should require authentication", async () => {
    const res = await server.get("/api/cron.daily");
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toBe("token is required");
  });

  it("should validate token", async () => {
    const res = await server.get("/api/cron.daily?token=token");
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toBe("invalid token");
  });
});
