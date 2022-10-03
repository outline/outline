import { getTestDatabase, getTestServer } from "@server/test/support";

const db = getTestDatabase();
const server = getTestServer();

afterAll(server.disconnect);

beforeEach(db.flush);

describe("#cron.daily", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/cron.daily");
    expect(res.status).toEqual(401);
  });
});
