import "~/stores";
import { addMonths, subDays } from "date-fns";
import { getCookie, removeCookie, setCookie } from "tiny-cookie";
import sharedEnv from "@shared/env";
import RootStore from "./RootStore";

vi.mock("~/utils/isCloudHosted", () => ({ default: true }));
vi.mock("~/utils/ApiClient", () => ({
  client: {
    setUnauthorizedHandler: vi.fn(),
    post: vi.fn(() => new Promise<never>(() => undefined)),
  },
}));
vi.mock("tiny-cookie", () => ({
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  removeCookie: vi.fn(),
}));

const teamId = "cc26004c-c36f-4d94-8614-d73b7fbd1a01";
const otherId = "cc26004c-c36f-4d94-8614-d73b7fbd1a02";
const session = {
  name: "Workspace",
  logoUrl: null,
  url: "https://team.outline.dev",
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem("AUTH_STORE");
  sharedEnv.URL = "https://app.outline.dev";
  vi.stubGlobal("location", { hostname: "team.outline.dev" });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthStore.logout", () => {
  it("keeps the remaining workspace cookie persistent", async () => {
    const store = new RootStore();
    store.auth.add({ id: teamId });
    store.auth.currentTeamId = teamId;
    const expiresAt = addMonths(new Date(), 1).toISOString();
    vi.mocked(getCookie).mockReturnValue(
      JSON.stringify({
        [teamId]: session,
        [otherId]: { ...session, expiresAt },
        "cc26004c-c36f-4d94-8614-d73b7fbd1a03": {
          ...session,
          expiresAt: subDays(new Date(), 1).toISOString(),
        },
      })
    );

    await store.auth.logout({ revokeToken: false, clearCache: false });

    expect(setCookie).toHaveBeenCalledWith(
      "sessions",
      JSON.stringify({
        [otherId]: { ...session, expiresAt },
      }),
      { domain: "outline.dev", path: "/", expires: new Date(expiresAt) }
    );
  });

  it("deletes the cookie when no workspaces remain", async () => {
    const store = new RootStore();
    store.auth.add({ id: teamId });
    store.auth.currentTeamId = teamId;
    vi.mocked(getCookie).mockReturnValue(JSON.stringify({ [teamId]: session }));

    await store.auth.logout({ revokeToken: false, clearCache: false });

    expect(removeCookie).toHaveBeenCalledWith("sessions", {
      domain: "outline.dev",
      path: "/",
    });
  });

  it("does not write a sessions cookie on a custom domain", async () => {
    vi.stubGlobal("location", { hostname: "docs.example.com" });
    const store = new RootStore();
    store.auth.add({ id: teamId });
    store.auth.currentTeamId = teamId;

    await store.auth.logout({ revokeToken: false, clearCache: false });

    expect(setCookie).not.toHaveBeenCalled();
    expect(removeCookie).not.toHaveBeenCalled();
  });
});
