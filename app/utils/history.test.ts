import type { Location } from "history";
import { patchLocation } from "./history";

describe("patchLocation", () => {
  const location: Location = {
    pathname: "/doc/my-doc",
    search: "?foo=bar",
    hash: "#one",
    state: { sidebarContext: "starred-123" },
    key: "abc123",
  };

  it("carries over the safe fields and applies the patch", () => {
    expect(patchLocation(location, { hash: "#two" })).toEqual({
      pathname: "/doc/my-doc",
      search: "?foo=bar",
      hash: "#two",
      state: { sidebarContext: "starred-123" },
    });
  });

  it("does not carry over internal fields such as key", () => {
    expect(patchLocation(location, {})).not.toHaveProperty("key");
  });

  it("can override multiple fields at once", () => {
    expect(
      patchLocation(location, { search: "?q=1", hash: "#three" })
    ).toMatchObject({ search: "?q=1", hash: "#three" });
  });
});
