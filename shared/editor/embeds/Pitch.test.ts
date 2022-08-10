import Pitch from "./Pitch";

describe("Pitch", () => {
  const match = Pitch.ENABLED[0];

  test("to not be enabled elsewhere", () => {
    expect(
      "https://appppitch.com/app/presentation/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/player/c9d837d74182317".match(
        match
      )
    ).toBe(null);
    expect(
      "https://app.pitchhcom/app/presentation/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/player/c9d837d74182317".match(
        match
      )
    ).toBe(null);
  });
});
