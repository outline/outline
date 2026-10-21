import { SlackStrategy } from "./SlackStrategy";

describe("SlackStrategy", () => {
  const strategy = new SlackStrategy(
    {
      clientID: "client-id",
      clientSecret: "client-secret",
      passReqToCallback: true,
    },
    vi.fn()
  );

  it("uses the slack name", () => {
    expect(strategy.name).toBe("slack");
  });

  it("loads the user profile", async () => {
    const identity = {
      ok: true,
      team: {
        id: "T123",
        name: "Example",
        domain: "example",
        image_192: "https://example.com/team_192.png",
        image_230: "https://example.com/team_230.png",
      },
      user: {
        id: "U123",
        name: "Jane Doe",
        email: "jane@example.com",
        image_192: "https://example.com/user_192.png",
        image_230: "https://example.com/user_230.png",
      },
    };
    const get = vi
      .spyOn(strategy["_oauth2"], "get")
      .mockImplementation((_url, _token, callback) =>
        // @ts-expect-error oauth typings do not allow a null error
        callback(null, JSON.stringify(identity))
      );

    const profile = await new Promise((resolve, reject) =>
      strategy.userProfile("token", (err, result) =>
        err ? reject(err) : resolve(result)
      )
    );

    expect(get).toHaveBeenCalledWith(
      "https://slack.com/api/users.identity",
      "token",
      expect.any(Function)
    );
    expect(profile).toEqual({
      provider: "slack",
      id: "U123",
      displayName: "Jane Doe",
      team: identity.team,
      user: identity.user,
    });
  });

  it("returns an error when Slack rejects the token", async () => {
    vi.spyOn(strategy["_oauth2"], "get").mockImplementation(
      (_url, _token, callback) =>
        // @ts-expect-error oauth typings do not allow a null error
        callback(null, JSON.stringify({ ok: false, error: "invalid_auth" }))
    );

    const err = await new Promise((resolve) =>
      strategy.userProfile("token", resolve)
    );

    expect(err).toBeInstanceOf(Error);
  });
});
