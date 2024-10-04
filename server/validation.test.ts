import { v4 as uuidv4 } from "uuid";
import { Buckets } from "./models/helpers/AttachmentHelper";
import { ValidateKey } from "./validation";

describe("#ValidateKey.isValid", () => {
  it("should return false if number of key components are not equal to 4", () => {
    expect(
      ValidateKey.isValid(`${Buckets.uploads}/${uuidv4()}/${uuidv4()}`)
    ).toBe(false);
    expect(
      ValidateKey.isValid(`${Buckets.uploads}/${uuidv4()}/${uuidv4()}/foo/bar`)
    ).toBe(false);
  });

  it("should return false if the first key component is not a valid bucket", () => {
    expect(ValidateKey.isValid(`foo/${uuidv4()}/${uuidv4()}/bar.png`)).toBe(
      false
    );
  });

  it("should return false if second and third key components are not UUID", () => {
    expect(
      ValidateKey.isValid(`${Buckets.uploads}/foo/${uuidv4()}/bar.png`)
    ).toBe(false);
    expect(
      ValidateKey.isValid(`${Buckets.uploads}/${uuidv4()}/foo/bar.png`)
    ).toBe(false);
  });

  it("should return true successfully validating key", () => {
    expect(
      ValidateKey.isValid(`${Buckets.public}/${uuidv4()}/${uuidv4()}/foo.png`)
    ).toBe(true);
    expect(
      ValidateKey.isValid(`${Buckets.uploads}/${uuidv4()}/${uuidv4()}/foo.png`)
    ).toBe(true);
    expect(
      ValidateKey.isValid(`${Buckets.avatars}/${uuidv4()}/${uuidv4()}`)
    ).toBe(true);
  });
});

describe("#ValidateKey.sanitize", () => {
  it("should sanitize malicious looking keys", () => {
    const uuid1 = uuidv4();
    const uuid2 = uuidv4();
    expect(
      ValidateKey.sanitize(`public/${uuid1}/${uuid2}/~\.\u0000\malicious_key`)
    ).toEqual(`public/${uuid1}/${uuid2}/~.malicious_key`);
  });

  it("should remove potential path traversal", () => {
    const uuid1 = uuidv4();
    const uuid2 = uuidv4();
    expect(
      ValidateKey.sanitize(`public/${uuid1}/${uuid2}/../../malicious_key`)
    ).toEqual(`public/${uuid1}/${uuid2}/malicious_key`);
  });
});
