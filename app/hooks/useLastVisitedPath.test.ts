import { getCookie, removeCookie } from "tiny-cookie";
import { setPostLoginPath } from "./useLastVisitedPath";

const key = "postLoginRedirectPath";

describe("setPostLoginPath", () => {
  beforeEach(() => {
    sessionStorage.clear();
    removeCookie(key);
  });

  it("stores the path in session storage and the shared cookie", () => {
    setPostLoginPath("/doc/a");

    expect(sessionStorage.getItem(key)).toBe("/doc/a");
    expect(getCookie(key)).toBe("/doc/a");
  });

  it("does not change the shared cookie when tabOnly is set", () => {
    setPostLoginPath("/doc/a");
    setPostLoginPath("/doc/b", { tabOnly: true });

    expect(sessionStorage.getItem(key)).toBe("/doc/b");
    expect(getCookie(key)).toBe("/doc/a");
  });

  it("ignores paths that are not allowed as a login redirect", () => {
    setPostLoginPath("/home", { tabOnly: true });

    expect(sessionStorage.getItem(key)).toBeNull();
  });
});
