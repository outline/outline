import { http, HttpResponse } from "msw";
import { server } from "@server/test/msw";
import { getVersionInfo, getVersion } from "./getInstallationInfo";

const dockerHubUrl =
  "https://hub.docker.com/v2/repositories/outlinewiki/outline/tags";

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
    server.use(
      http.get(dockerHubUrl, () =>
        HttpResponse.json({
          results: [{ name: "0.81.0" }, { name: "0.80.0" }, { name: "0.79.0" }],
          next: null,
        })
      )
    );

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: "0.81.0",
      versionsBehind: 1,
    });
  });

  it("should return fallback values when Docker Hub is unreachable", async () => {
    server.use(http.get(dockerHubUrl, () => HttpResponse.error()));

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: currentVersion,
      versionsBehind: -1,
    });
  });

  it("should return fallback values when fetch times out", async () => {
    server.use(http.get(dockerHubUrl, () => HttpResponse.error()));

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: currentVersion,
      versionsBehind: -1,
    });
  });

  it("should return fallback values when DNS lookup fails", async () => {
    server.use(http.get(dockerHubUrl, () => HttpResponse.error()));

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: currentVersion,
      versionsBehind: -1,
    });
  });

  it("should return fallback values when response is not JSON", async () => {
    server.use(
      http.get(
        dockerHubUrl,
        () => new HttpResponse("Not JSON", { status: 200 })
      )
    );

    const result = await getVersionInfo(currentVersion);

    expect(result).toEqual({
      latestVersion: currentVersion,
      versionsBehind: -1,
    });
  });
});
