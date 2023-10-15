import Linkedin from "./Linkedin";

describe("Linkedin", () => {
  const match = Linkedin.ENABLED[0];

  test("to be enabled on post link", () => {
    expect(
      "https://www.linkedin.com/posts/github_highlight-your-expertise-with-github-certifications-activity-7117157514097352704-F4Mz?utm_source=share&utm_medium=member_desktop".match(
        match
      )
    ).toBeTruthy();
  });

  test("to be enabled on embed link", () => {
    expect(
      "https://www.linkedin.com/embed/feed/update/urn:li:share:7117157513422090241".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://www.linkedin.com/".match(match)).toBe(null);
    expect("https://www.linkedin.com/posts/".match(match)).toBe(null);
    expect("https://www.linkedin.com/embed/".match(match)).toBe(null);
    expect("https://www.linkedin.com/embed/feed/update/".match(match)).toBe(
      null
    );
    expect(
      "https://www.linkedin.com/embed/feed/update/urn:li:".match(match)
    ).toBe(null);
    expect(
      "https://www.linkedin.com/embed/feed/update/urn:li:share:".match(match)
    ).toBe(null);
    expect(
      "https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:".match(match)
    ).toBe(null);
  });
});
