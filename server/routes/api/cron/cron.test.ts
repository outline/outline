import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("POST /api/cron.daily", () => {
  it("should require token", async () => {
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
    expect(res.status).toEqual(401);
    expect(body.message).toBe("Invalid secret token");
  });

  it("should validate limit", async () => {
    const res = await server.post("/api/cron.daily", {
      body: {
        limit: -1,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toBe("limit: Number must be greater than 0");
  });
});

describe("GET /api/cron.daily", () => {
  it("should require token", async () => {
    const res = await server.get("/api/cron.daily");
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toBe("token is required");
  });

  it("should validate token", async () => {
    const res = await server.get("/api/cron.daily?token=token");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body.message).toBe("Invalid secret token");
  });

  it("should validate limit", async () => {
    const res = await server.get("/api/cron.daily?limit=-1");
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toBe("limit: Number must be greater than 0");
  });
});

describe("POST /api/utils.gc", () => {
  it("should require token", async () => {
    const res = await server.post("/api/utils.gc");
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toBe("token is required");
  });

  it("should validate token", async () => {
    const res = await server.post("/api/utils.gc", {
      body: {
        token: "token",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body.message).toBe("Invalid secret token");
  });

  it("should validate limit", async () => {
    const res = await server.post("/api/utils.gc", {
      body: {
        limit: -1,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toBe("limit: Number must be greater than 0");
  });
});

describe("GET /api/utils.gc", () => {
  it("should require token", async () => {
    const res = await server.get("/api/utils.gc");
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toBe("token is required");
  });

  it("should validate token", async () => {
    const res = await server.get("/api/utils.gc?token=token");
    const body = await res.json();
    expect(res.status).toEqual(401);
    expect(body.message).toBe("Invalid secret token");
  });

  it("should validate limit", async () => {
    const res = await server.get("/api/utils.gc?limit=-1");
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toBe("limit: Number must be greater than 0");
  });
});
