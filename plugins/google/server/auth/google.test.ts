import { buildSubdomain, buildTeam } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

/**
 * Starts Google sign-in from the given team subdomain.
 *
 * @param subdomain the subdomain of the team.
 * @returns the URL that the user is redirected to.
 */
async function startSignIn(subdomain: string) {
  const res = await server.get("/auth/google", {
    redirect: "manual",
    headers: {
      host: `${subdomain}.outline.dev`,
    },
  });
  expect(res.status).toEqual(302);
  return new URL(res.headers.get("location") ?? "");
}

describe("auth/google", () => {
  it("should send the Workspace domain as a hint", async () => {
    const subdomain = buildSubdomain();
    await buildTeam({
      subdomain,
      authenticationProviders: [{ name: "google", providerId: "example.com" }],
    });

    const location = await startSignIn(subdomain);
    expect(location.searchParams.get("hd")).toEqual("example.com");
  });

  it("should not send a hint when the team has more than one domain", async () => {
    const subdomain = buildSubdomain();
    await buildTeam({
      subdomain,
      authenticationProviders: [
        { name: "google", providerId: "example.com" },
        { name: "google", providerId: "example.org" },
      ],
    });

    const location = await startSignIn(subdomain);
    expect(location.searchParams.has("hd")).toBe(false);
  });

  it("should ignore disabled providers", async () => {
    const subdomain = buildSubdomain();
    await buildTeam({
      subdomain,
      authenticationProviders: [
        { name: "google", providerId: "example.com" },
        { name: "google", providerId: "example.org", enabled: false },
      ],
    });

    const location = await startSignIn(subdomain);
    expect(location.searchParams.get("hd")).toEqual("example.com");
  });

  it("should not send a hint without a team", async () => {
    const location = await startSignIn("app");
    expect(location.searchParams.has("hd")).toBe(false);
  });
});
