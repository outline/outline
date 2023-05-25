import Kroki from "./Kroki";

describe("Kroki", () => {
  const match = Kroki.ENABLED[0];

  test("to be enabled on viewer link", () => {
    expect(
      "https://kroki.io/seqdiag/svg/eNorTi1MyUxMV6jmUlBIKsovL04tUtC1UyhPTQKyyoCc6JzEpNQcBVsFJXfXEAX9zLyU1Aq9jJLcHKVYayQ9Nrq6CE3WhA0L8A8GmpaUk5-un5yfm5uaVwIxD6EWqDElsSQxKbE4FUmfp1-wa1CIAg49IFfANOFxXS0A68hQUg==".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect(
      "https://app.kroki.io/eNorTi1MyUxMV6jmUlBIKsovL04tUtC1UyhPTQKyyoC".match(
        match
      )
    ).toBe(null);
  });
});
