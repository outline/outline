import { GoogleStrategy } from "./GoogleStrategy";

describe("GoogleStrategy", () => {
  const strategy = new GoogleStrategy(
    {
      clientID: "client-id",
      clientSecret: "client-secret",
      passReqToCallback: true,
    },
    vi.fn()
  );

  it("uses the google name", () => {
    expect(strategy.name).toBe("google");
  });

  it("maps options to authorization params", () => {
    expect(
      strategy.authorizationParams({
        accessType: "offline",
        prompt: "select_account consent",
        hostedDomain: "example.com",
      })
    ).toEqual({
      access_type: "offline",
      prompt: "select_account consent",
      hd: "example.com",
    });
    expect(strategy.authorizationParams({})).toEqual({});
  });

  it("loads the user profile", async () => {
    const userInfo = {
      sub: "123",
      name: "Jane Doe",
      email: "jane@example.com",
      picture: "https://example.com/photo=s96-c",
      locale: "en",
      hd: "example.com",
    };
    const get = vi
      .spyOn(strategy["_oauth2"], "get")
      .mockImplementation((_url, _token, callback) =>
        // @ts-expect-error oauth typings do not allow a null error
        callback(null, JSON.stringify(userInfo))
      );

    const profile = await new Promise((resolve, reject) =>
      strategy.userProfile("token", (err, result) =>
        err ? reject(err) : resolve(result)
      )
    );

    expect(get).toHaveBeenCalledWith(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      "token",
      expect.any(Function)
    );
    expect(profile).toMatchObject({
      provider: "google",
      id: "123",
      displayName: "Jane Doe",
      email: "jane@example.com",
      picture: userInfo.picture,
      _json: userInfo,
    });
  });

  it("returns an error when the request fails", async () => {
    vi.spyOn(strategy["_oauth2"], "get").mockImplementation(
      (_url, _token, callback) => callback({ statusCode: 401 })
    );

    const err = await new Promise((resolve) =>
      strategy.userProfile("token", resolve)
    );

    expect(err).toBeInstanceOf(Error);
  });
});
