import { version } from "../../package.json";
import fetch from "./fetch";

const dockerhubLink =
  "https://hub.docker.com/v2/repositories/outlinewiki/outline";

function isFullReleaseVersion(versionName: string): boolean {
  const releaseRegex = /^(version-)?\d+\.\d+\.\d+$/; // Matches "N.N.N" or "version-N.N.N" for dockerhub releases before v0.56.0"
  return releaseRegex.test(versionName);
}

export async function getVersionInfo(currentVersion: string): Promise<{
  latestVersion: string;
  versionsBehind: number;
}> {
  let allVersions: string[] = [];
  let latestVersion: string | null = null;
  let nextUrl: string | null =
    dockerhubLink + "/tags?name=&ordering=last_updated&page_size=100";

  // Continue fetching pages until the required versions are found or no more pages
  while (nextUrl) {
    const response = await fetch(nextUrl);
    const data = await response.json();

    // Map and filter the versions to keep only full releases
    const pageVersions = data.results
      .map((result: any) => result.name)
      .filter(isFullReleaseVersion);

    allVersions = allVersions.concat(pageVersions);

    // Set the latest version if not already set
    if (!latestVersion && pageVersions.length > 0) {
      latestVersion = pageVersions[0];
    }

    // Check if the current version is found
    const currentIndex = allVersions.findIndex(
      (version: string) => version === currentVersion
    );

    if (currentIndex !== -1) {
      const versionsBehind = currentIndex; // The number of versions behind
      return {
        latestVersion: latestVersion || currentVersion, // Fallback to current if no latest found
        versionsBehind,
      };
    }

    nextUrl = data.next || null;
  }

  return {
    latestVersion: latestVersion || currentVersion,
    versionsBehind: -1, // Return -1 if current version is not found
  };
}

export function getVersion(): string {
  return version;
}
