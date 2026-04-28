import { randomUUID } from "node:crypto";
import { Buckets } from "./models/helpers/AttachmentHelper";
import { ValidateKey, isISO8601Duration } from "./validation";

describe("#ValidateKey.isValid", () => {
  it("should return false if number of key components is incorrect", () => {
    expect(
      ValidateKey.isValid(
        `${Buckets.uploads}/${randomUUID()}/${randomUUID()}/foo/bar`
      )
    ).toBe(false);
  });

  it("should return false if the first key component is not a valid bucket", () => {
    expect(
      ValidateKey.isValid(`foo/${randomUUID()}/${randomUUID()}/bar.png`)
    ).toBe(false);
  });

  it("should return false if second and third key components are not UUID", () => {
    expect(
      ValidateKey.isValid(`${Buckets.uploads}/foo/${randomUUID()}/bar.png`)
    ).toBe(false);
    expect(
      ValidateKey.isValid(`${Buckets.uploads}/${randomUUID()}/foo/bar.png`)
    ).toBe(false);
  });

  it("should return true successfully validating key", () => {
    expect(
      ValidateKey.isValid(
        `${Buckets.public}/${randomUUID()}/${randomUUID()}/foo.png`
      )
    ).toBe(true);
    expect(
      ValidateKey.isValid(
        `${Buckets.uploads}/${randomUUID()}/${randomUUID()}/foo.png`
      )
    ).toBe(true);
    expect(
      ValidateKey.isValid(`${Buckets.avatars}/${randomUUID()}/${randomUUID()}`)
    ).toBe(true);
  });
});

describe("#ValidateKey.sanitize", () => {
  it("should sanitize malicious looking keys", () => {
    const uuid1 = randomUUID();
    const uuid2 = randomUUID();
    expect(
      ValidateKey.sanitize(`public/${uuid1}/${uuid2}/~\.\u0000\malicious_key`)
    ).toEqual(`public/${uuid1}/${uuid2}/~.malicious_key`);
  });

  it("should remove potential path traversal", () => {
    const uuid1 = randomUUID();
    const uuid2 = randomUUID();
    expect(
      ValidateKey.sanitize(`public/${uuid1}/${uuid2}/../../malicious_key`)
    ).toEqual(`public/${uuid1}/${uuid2}/malicious_key`);
  });

  it("should remove problematic characters", () => {
    const uuid1 = randomUUID();
    const uuid2 = randomUUID();
    expect(ValidateKey.sanitize(`public/${uuid1}/${uuid2}/test#:*?`)).toEqual(
      `public/${uuid1}/${uuid2}/test`
    );
  });
});

describe("#isISO8601Duration", () => {
  describe("valid cases", () => {
    it.each([
      "P1Y",
      "P1M",
      "P1D",
      "P1W",
      "P52W",
      "P0D",
      "P10Y",
      "P365D",
      "PT1H",
      "PT30M",
      "PT45S",
      "PT1H30M",
      "PT1H30M45S",
      "PT24H",
      "PT1500S",
      "PT0S",
      "P1Y2M",
      "P1Y2M3D",
      "P2M3D",
      "P1DT12H",
      "P1Y2M3DT4H5M6S",
      "-P1D",
      "-P7D",
      "-PT1H",
      "-P1Y2M3DT4H5M6S",
      "-P1W",
    ])("accepts %s", (value) => {
      expect(isISO8601Duration(value)).toBe(true);
    });
  });

  describe("invalid cases", () => {
    it.each([
      // Missing prefix
      "1D",
      "T1H",
      "Y1",
      // Empty / lone prefix
      "",
      "P",
      "PT",
      "-P",
      "-PT",
      // Missing number
      "PD",
      "PMW",
      "PT H",
      // Missing unit
      "P1",
      "PT1",
      "P1Y2",
      // Unknown unit
      "P1Z",
      "P1X",
      "PT1Q",
      // Wrong section (date vs time)
      "P1H",
      "PT1Y",
      "PT1D",
      // Trailing T
      "P1DT",
      "P1YT",
      // Weeks combined with other units
      "P1W1D",
      "P1Y1W",
      // Decimals
      "P1.5D",
      "P0.5W",
      "PT1.5H",
      // Sign in wrong place
      "P-1D",
      "PT-1H",
      "--P1D",
      "+P1D",
      // Whitespace
      "P 1D",
      "P1D ",
      " P1D",
      "- P1D",
      // Lowercase
      "p1d",
      "P1d",
      "pt1h",
      // Quotes / SQL metacharacters
      "P1D'",
      "P1D; DROP TABLE",
      "P1D--",
      "P1D OR 1=1",
      // Order swap
      "P1D1Y",
      "P1M1Y",
    ])("rejects %j", (value) => {
      expect(isISO8601Duration(value)).toBe(false);
    });
  });
});
