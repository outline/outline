import "~/stores";
import { addMonths, subDays } from "date-fns";
import { getCookie, setCookie } from "tiny-cookie";
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
  logoUrl: "",
  url: "https://team.outline.dev",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-31T12:00:00.000Z"));
  localStorage.removeItem("AUTH_STORE");
  sharedEnv.URL = "https://app.outline.dev";
  vi.stubGlobal("location", { hostname: "team.outline.dev" });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("AuthStore.logout", () => {
  it("remembers logged-out and expired workspaces alongside active sessions", async () => {
    const store = new RootStore();
    store.auth.add({
      id: teamId,
      name: session.name,
      avatarUrl: "",
      url: session.url,
    });
    store.auth.currentTeamId = teamId;
    const expiresAt = addMonths(new Date(), 1).toISOString();
    const expired = {
      ...session,
      expiresAt: subDays(new Date(), 1).toISOString(),
      lastUsedAt: subDays(new Date(), 1).toISOString(),
    };
    vi.mocked(getCookie).mockReturnValue(
      JSON.stringify({
        [teamId]: session,
        [otherId]: {
          ...session,
          expiresAt,
          lastUsedAt: new Date().toISOString(),
        },
        "cc26004c-c36f-4d94-8614-d73b7fbd1a03": expired,
        "cc26004c-c36f-4d94-8614-d73b7fbd1a04": {
          ...session,
          lastUsedAt: "2026-07-01T12:00:00.000Z",
        },
      })
    );

    await store.auth.logout({ revokeToken: false, clearCache: false });

    expect(setCookie).toHaveBeenCalledWith(
      "sessions",
      JSON.stringify({
        [teamId]: {
          ...session,
          expiresAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
        },
        [otherId]: {
          ...session,
          expiresAt,
          lastUsedAt: new Date().toISOString(),
        },
        "cc26004c-c36f-4d94-8614-d73b7fbd1a03": expired,
      }),
      { domain: "outline.dev", path: "/", expires: addMonths(new Date(), 3) }
    );
  });

  it("retains the last workspace after logout even if its cookie entry is missing", async () => {
    const store = new RootStore();
    store.auth.add({
      id: teamId,
      name: session.name,
      avatarUrl: "",
      url: session.url,
    });
    store.auth.currentTeamId = teamId;
    vi.mocked(getCookie).mockReturnValue("{}");

    await store.auth.logout({ revokeToken: false, clearCache: false });

    expect(setCookie).toHaveBeenCalledWith(
      "sessions",
      JSON.stringify({
        [teamId]: {
          ...session,
          expiresAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
        },
      }),
      { domain: "outline.dev", path: "/", expires: addMonths(new Date(), 3) }
    );
  });

  it("does not write a sessions cookie on a custom domain", async () => {
    vi.stubGlobal("location", { hostname: "docs.example.com" });
    const store = new RootStore();
    store.auth.add({ id: teamId });
    store.auth.currentTeamId = teamId;

    await store.auth.logout({ revokeToken: false, clearCache: false });

    expect(setCookie).not.toHaveBeenCalled();
  });
});
