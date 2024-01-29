import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("oidc", () => {
  it("should pass query params along with auth redirect", async () => {
    const res = await server.get("/auth/oidc?myParam=someParam", {
      redirect: "manual",
    });
    expect(res.headers.get("location")).not.toBeNull();
    const redirectLocation = new URL(res.headers.get("location")!);
    expect(res.status).toEqual(302);
    expect(redirectLocation.searchParams.get("myParam")).toEqual("someParam");
  });
});
