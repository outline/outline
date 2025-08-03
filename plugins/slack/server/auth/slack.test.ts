import { buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { parseEmail } from "@shared/utils/email";

const server = getTestServer();

describe("#slack.post", () => {
  it("should fail with status 400 bad request if query param state is not valid", async () => {
    const user = await buildUser();
    const res = await server.get(
      `/auth/slack.post?state=${JSON.stringify(
        {}
      )}&code=123&token=${user.getJwtToken()}`
    );
    expect(res.status).toEqual(400);
  });

  it("should fail with status 400 bad request if query param state is not JSON", async () => {
    const user = await buildUser();
    const res = await server.get(
      `/auth/slack.post?state=bad&code=123&token=${user.getJwtToken()}`
    );
    expect(res.status).toEqual(400);
  });

  it("should fail with status 400 bad request when both code and error are missing in query params", async () => {
    const res = await server.get(
      "/auth/slack.post?state=182d14d5-0dbd-4521-ac52-25484c25c96e"
    );
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("query: one of code or error is required");
  });
});

describe("Slack authentication domain extraction", () => {
  it("should correctly extract domain from user email", () => {
    const testCases = [
      { email: "user@gmail.com", expectedDomain: "gmail.com" },
      { email: "test@company.com", expectedDomain: "company.com" },
      {
        email: "admin@subdomain.domain.com",
        expectedDomain: "subdomain.domain.com",
      },
    ];

    testCases.forEach(({ email, expectedDomain }) => {
      const { domain } = parseEmail(email);
      expect(domain).toEqual(expectedDomain);
    });
  });
});
