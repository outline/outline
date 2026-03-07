import fetchMock from "jest-fetch-mock";
import { getVersionInfo, getVersion } from "./getInstallationInfo";

beforeEach(() => {
  fetchMock.resetMocks();
});

describe("getVersion", () => {
  it("should return the current version", () => {
    const version = getVersion();
    expect(version).toBeDefined();
    expect(typeof version).toBe("string");
  });
});

describe("getVersionInfo", () => {
  const currentVersion = "0.80.0";

  it("should return version info when Docker Hub is accessible", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        results: [
          { name: "0.81.0" },
          { name: "0.80.0" },
          { name: "0.79.0" },
        ],
        next: null,
      })
    );

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: "0.81.0",
      versionsBehind: 1,
    });
  });

  it("should return fallback values when Docker Hub is unreachable", async () => {
    fetchMock.mockRejectOnce(new Error("Network request failed"));

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: currentVersion,
      versionsBehind: -1,
    });
  });

  it("should return fallback values when fetch times out", async () => {
    fetchMock.mockRejectOnce(new Error("Request timeout after 10000ms"));

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: currentVersion,
      versionsBehind: -1,
    });
  });

  it("should return fallback values when DNS lookup fails", async () => {
    fetchMock.mockRejectOnce(new Error("DNS lookup failed"));

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: currentVersion,
      versionsBehind: -1,
    });
  });

  it("should return fallback values when response is not JSON", async () => {
    fetchMock.mockResponseOnce("Not JSON");

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: currentVersion,
      versionsBehind: -1,
    });
  });
});
