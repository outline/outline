import { randomUUID } from "node:crypto";
import { Buckets } from "./models/helpers/AttachmentHelper";
import { ValidateKey } from "./validation";

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
