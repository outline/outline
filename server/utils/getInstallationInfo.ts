import { version } from "../../package.json";
import fetch from "./fetch";

const dockerhubLink =
  "https://hub.docker.com/v2/repositories/outlinewiki/outline";

export function getVersion(): string {
  return version;
}

export async function getLatestVersion(): Promise<string> {
  const response = await fetch(
    dockerhubLink + "/tags?name=&ordering=last_updated&page_size=1"
  );
  const data = await response.json();
  return data.results[0].name;
}

export async function getVersionsBehind(
  currentVersion: string
): Promise<number> {
  let allVersions: string[] = [];
  let nextUrl: string | null =
    dockerhubLink + "/tags?name=&ordering=last_updated&page_size=100";

  // Continue fetching pages until the required versions are found or no more pages
  while (nextUrl) {
    const response = await fetch(nextUrl);
    const data = await response.json();

    // Map the versions from the current page
    const pageVersions = data.results.map((result: any) => result.name);
    allVersions = allVersions.concat(pageVersions); // Append to the cumulative list of versions

    // Check if the current and latest versions are found
    const currentIndex = allVersions.findIndex(
      (version: string) => version === currentVersion
    );

    if (currentIndex !== -1) {
      return currentIndex;
    }

    // If there's a next page, update the nextUrl, otherwise exit loop
    nextUrl = data.next || null;
  }

  return -1;
}
