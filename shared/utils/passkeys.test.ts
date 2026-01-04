import { generatePasskeyName, formatPasskeyNameWithDate } from "./passkeys";

describe("passkeys utilities", () => {
  describe("generatePasskeyName", () => {
    describe("browser detection", () => {
      it("detects Chrome on macOS", () => {
        const ua =
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toBe("Chrome on macOS (Biometric)");
      });

      it("detects Safari on macOS", () => {
        const ua =
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toBe("Safari on macOS (Biometric)");
      });

      it("detects Firefox on Windows", () => {
        const ua =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toBe("Firefox on Windows (Biometric)");
      });

      it("detects Edge on Windows", () => {
        const ua =
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toBe("Edge on Windows (Biometric)");
      });

      it("detects Opera on Linux", () => {
        const ua =
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toBe("Opera on Linux (Biometric)");
      });
    });

    describe("device detection", () => {
      it("detects iPhone", () => {
        const ua =
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toBe("iPhone (Biometric)");
      });

      it("detects iPad", () => {
        const ua =
          "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toBe("iPad (Biometric)");
      });

      it("detects Android Phone", () => {
        const ua =
          "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toBe("Android Phone (Biometric)");
      });

      it("detects Android Tablet", () => {
        const ua =
          "Mozilla/5.0 (Linux; Android 13; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toBe("Android Tablet (Biometric)");
      });
    });

    describe("OS detection", () => {
      it("detects Chrome OS", () => {
        const ua =
          "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toBe("Chrome on Chrome OS (Biometric)");
      });

      it("detects Linux", () => {
        const ua =
          "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toBe("Firefox on Linux (Biometric)");
      });
    });

    describe("authenticator type detection", () => {
      it("detects biometric authenticator", () => {
        const ua =
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toContain("Biometric");
      });

      it("detects security key (USB)", () => {
        const ua =
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        const name = generatePasskeyName(ua, ["usb"]);
        expect(name).toContain("Security Key");
      });

      it("detects security key (NFC)", () => {
        const ua =
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        const name = generatePasskeyName(ua, ["nfc"]);
        expect(name).toContain("Security Key");
      });

      it("detects security key (BLE)", () => {
        const ua =
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        const name = generatePasskeyName(ua, ["ble"]);
        expect(name).toContain("Security Key");
      });

      it("detects hybrid authenticator (phone)", () => {
        const ua =
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        const name = generatePasskeyName(ua, ["hybrid"]);
        expect(name).toContain("Phone");
      });
    });

    describe("edge cases", () => {
      it("handles missing user agent", () => {
        const name = generatePasskeyName(undefined, ["internal"]);
        expect(name).toBe("Biometric");
      });

      it("handles empty user agent", () => {
        const name = generatePasskeyName("", ["usb"]);
        expect(name).toBe("Security Key");
      });

      it("handles unknown user agent", () => {
        const name = generatePasskeyName("Unknown/1.0");
        expect(name).toBe("Passkey");
      });

      it("handles missing transports", () => {
        const ua =
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        const name = generatePasskeyName(ua, []);
        expect(name).toBe("Chrome on macOS");
      });

      it("handles no parameters", () => {
        const name = generatePasskeyName();
        expect(name).toBe("Passkey");
      });

      it("prioritizes device name over browser/OS", () => {
        const ua =
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
        const name = generatePasskeyName(ua, ["internal"]);
        expect(name).toBe("iPhone (Biometric)");
        expect(name).not.toContain("Safari");
      });
    });
  });

  describe("formatPasskeyNameWithDate", () => {
    it("formats passkey name with date", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const formatted = formatPasskeyNameWithDate("Chrome on macOS", date);
      expect(formatted).toMatch(/Chrome on macOS - \w+ \d+, \d{4}/);
    });

    it("handles different dates correctly", () => {
      const date = new Date("2023-12-25T00:00:00Z");
      const formatted = formatPasskeyNameWithDate("iPhone (Biometric)", date);
      expect(formatted).toContain("iPhone (Biometric) -");
      expect(formatted).toContain("2023");
    });

    it("handles current date", () => {
      const date = new Date();
      const formatted = formatPasskeyNameWithDate("Security Key", date);
      expect(formatted).toContain("Security Key -");
      expect(formatted).toMatch(/\w+ \d+, \d{4}/);
    });
  });
});
