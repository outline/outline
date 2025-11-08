import { getVersionInfo, getVersion } from "./getInstallationInfo";

describe("getInstallationInfo", () => {
  describe("getVersion", () => {
    it("should return the version from package.json", () => {
      const version = getVersion();
      expect(version).toBeDefined();
      expect(typeof version).toBe("string");
      expect(version).toMatch(/^\d+\.\d+\.\d+/); // Should match semver pattern
    });
  });

  describe("getVersionInfo", () => {
    it("should fetch version information from DockerHub", async () => {
      const currentVersion = "1.0.0"; // Use a known version for testing
      const result = await getVersionInfo(currentVersion);

      expect(result).toBeDefined();
      expect(result.latestVersion).toBeDefined();
      expect(typeof result.latestVersion).toBe("string");
      expect(typeof result.versionsBehind).toBe("number");
      expect(result.versionsBehind).toBeGreaterThanOrEqual(-1);
    }, 10000); // Increase timeout for API call

    it("should handle current version correctly", async () => {
      const currentVersion = getVersion();
      const result = await getVersionInfo(currentVersion);

      expect(result).toBeDefined();
      expect(result.latestVersion).toBeDefined();

      // If we're on the latest version, we should be 0 versions behind
      // If we're behind, it should be a positive number
      // If version is not found, it should be -1
      expect(result.versionsBehind).toBeGreaterThanOrEqual(-1);
    }, 10000);

    it("should filter only full release versions", async () => {
      // This test verifies that the version filtering logic works correctly
      // by checking that pre-release versions are excluded
      const testVersion = "0.1.0"; // Use a very old version to ensure we get results
      const result = await getVersionInfo(testVersion);

      expect(result).toBeDefined();
      expect(result.latestVersion).toBeDefined();

      // The latest version should match the full release pattern
      expect(result.latestVersion).toMatch(/^\d+\.\d+\.\d+$/);
    }, 10000);
  });
});
