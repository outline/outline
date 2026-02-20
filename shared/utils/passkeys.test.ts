import { generatePasskeyName } from "./passkeys";

describe("generatePasskeyName", () => {
  describe("AAGUID-based brand detection", () => {
    it("detects 1Password", () => {
      const aaguid = "bada5566-a7aa-401f-bd96-45619a55120d";
      const name = generatePasskeyName(aaguid);
      expect(name).toBe("1Password");
    });

    it("detects Google Password Manager", () => {
      const aaguid = "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4";
      const name = generatePasskeyName(aaguid);
      expect(name).toBe("Google Password Manager");
    });

    it("detects Windows Hello", () => {
      const aaguid = "08987058-cadc-4b81-b6e1-30de50dcbe96";
      const name = generatePasskeyName(aaguid);
      expect(name).toBe("Windows Hello");
    });

    it("detects iCloud Keychain (Managed)", () => {
      const aaguid = "dd4ec289-e01d-41c9-bb89-70fa845d4bf2";
      const name = generatePasskeyName(aaguid);
      expect(name).toBe("iCloud Keychain (Managed)");
    });

    it("detects Bitwarden", () => {
      const aaguid = "d548826e-79b4-db40-a3d8-11116f7e8349";
      const name = generatePasskeyName(aaguid);
      expect(name).toBe("Bitwarden");
    });

    it("prefers AAGUID over user agent", () => {
      const aaguid = "bada5566-a7aa-401f-bd96-45619a55120d";
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const name = generatePasskeyName(aaguid, ua, ["internal"]);
      expect(name).toBe("1Password");
      expect(name).not.toContain("Chrome");
    });

    it("falls back to user agent when AAGUID is unknown", () => {
      const aaguid = "00000000-0000-0000-0000-000000000000";
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const name = generatePasskeyName(aaguid, ua, ["internal"]);
      expect(name).toBe("Chrome on macOS");
    });
  });

  describe("browser detection", () => {
    it("detects Chrome on macOS", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const name = generatePasskeyName(undefined, ua, ["internal"]);
      expect(name).toBe("Chrome on macOS");
    });

    it("detects Safari on macOS", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
      const name = generatePasskeyName(undefined, ua, ["internal"]);
      expect(name).toBe("Safari on macOS");
    });

    it("detects Firefox on Windows", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0";
      const name = generatePasskeyName(undefined, ua, ["internal"]);
      expect(name).toBe("Firefox on Windows");
    });

    it("detects Edge on Windows", () => {
      const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
      const name = generatePasskeyName(undefined, ua, ["internal"]);
      expect(name).toBe("Edge on Windows");
    });

    it("detects Opera on Linux", () => {
      const ua =
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0";
      const name = generatePasskeyName(undefined, ua, ["internal"]);
      expect(name).toBe("Opera on Linux");
    });
  });

  describe("device detection", () => {
    it("detects iPhone", () => {
      const ua =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
      const name = generatePasskeyName(undefined, ua, ["internal"]);
      expect(name).toBe("iPhone");
    });

    it("detects iPad", () => {
      const ua =
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
      const name = generatePasskeyName(undefined, ua, ["internal"]);
      expect(name).toBe("iPad");
    });

    it("detects Android Phone", () => {
      const ua =
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
      const name = generatePasskeyName(undefined, ua, ["internal"]);
      expect(name).toBe("Android Phone");
    });

    it("detects Android Tablet", () => {
      const ua =
        "Mozilla/5.0 (Linux; Android 13; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const name = generatePasskeyName(undefined, ua, ["internal"]);
      expect(name).toBe("Android Tablet");
    });
  });

  describe("OS detection", () => {
    it("detects Chrome OS", () => {
      const ua =
        "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const name = generatePasskeyName(undefined, ua, ["internal"]);
      expect(name).toBe("Chrome on Chrome OS");
    });

    it("detects Linux", () => {
      const ua =
        "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";
      const name = generatePasskeyName(undefined, ua, ["internal"]);
      expect(name).toBe("Firefox on Linux");
    });
  });

  describe("authenticator type detection", () => {
    it("detects security key (USB)", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const name = generatePasskeyName(undefined, ua, ["usb"]);
      expect(name).toContain("Security Key");
    });

    it("detects security key (NFC)", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const name = generatePasskeyName(undefined, ua, ["nfc"]);
      expect(name).toContain("Security Key");
    });

    it("detects security key (BLE)", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const name = generatePasskeyName(undefined, ua, ["ble"]);
      expect(name).toContain("Security Key");
    });

    it("detects hybrid authenticator (phone)", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const name = generatePasskeyName(undefined, ua, ["hybrid"]);
      expect(name).toContain("Phone");
    });
  });

  describe("edge cases", () => {
    it("handles missing user agent", () => {
      const name = generatePasskeyName(undefined, undefined, ["internal"]);
      expect(name).toBe("Passkey");
    });

    it("handles empty user agent", () => {
      const name = generatePasskeyName(undefined, "", ["usb"]);
      expect(name).toBe("Security Key");
    });

    it("handles unknown user agent", () => {
      const name = generatePasskeyName(undefined, "Unknown/1.0");
      expect(name).toBe("Passkey");
    });

    it("handles missing transports", () => {
      const ua =
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
      const name = generatePasskeyName(undefined, ua, []);
      expect(name).toBe("Chrome on macOS");
    });

    it("handles no parameters", () => {
      const name = generatePasskeyName();
      expect(name).toBe("Passkey");
    });

    it("prioritizes device name over browser/OS", () => {
      const ua =
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
      const name = generatePasskeyName(undefined, ua, ["internal"]);
      expect(name).toBe("iPhone");
      expect(name).not.toContain("Safari");
    });
  });
});
