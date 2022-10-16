import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#cron.daily", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/cron.daily");
    expect(res.status).toEqual(401);
  });
});
