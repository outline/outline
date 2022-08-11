import GoogleForms from "./GoogleForms";

describe("GoogleForms", () => {
  const match = GoogleForms.ENABLED[0];

  test("to be enabled on long-form share links", () => {
    expect(
      "https://docs.google.com/forms/d/e/1FAIpQLSetbCGiE8DhfVQZMtLE_CU2MwpSsrkXi690hkEDREOvMu8VYQ/viewform?usp=sf_link".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://docs.google.com/forms/d/e/1FAIpQLSetbCGiE8DhfVQZMtLE_CU2MwpSsrkXi690hkEDREOvMu8VYQ/viewform".match(
        match
      )
    ).toBeTruthy();
    expect(
      "https://docs.google.com/forms/d/e/1FAIpQLSetbCGiE8DhfVQZMtLE_CU2MwpSsrkXi690hkEDREOvMu8VYQ/viewform?embedded=true".match(
        match
      )
    ).toBeTruthy();
  });

  test("to be enabled on edit links", () => {
    expect(
      "https://docs.google.com/forms/d/1zG75dmHQGpomQlWB6VtRhWajNer7mKMjtApM_aRAJV8/edit".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://docs.google.com/forms".match(match)).toBe(null);
    expect("https://docs.google.com/forms/d/".match(match)).toBe(null);
    expect("https://docs.google.com".match(match)).toBe(null);
    expect("https://www.google.com".match(match)).toBe(null);
    expect(
      "https://docssgoogle.com/forms/d/e/1FAIpQLSetbCGiE8DhfVQZMtLE_CU2MwpSsrkXi690hkEDREOvMu8VYQ/viewform?usp=sf_link".match(
        match
      )
    ).toBe(null);
    expect(
      "https://docs.googleecom/forms/d/e/1FAIpQLSetbCGiE8DhfVQZMtLE_CU2MwpSsrkXi690hkEDREOvMu8VYQ/viewform".match(
        match
      )
    ).toBe(null);
  });
});
