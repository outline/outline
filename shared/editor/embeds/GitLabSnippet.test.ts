import GitLabSnippet from "./GitLabSnippet";

describe("GitLabSnippet", () => {
  const match = GitLabSnippet.ENABLED[0];

  test("to be enabled on snippet link", () => {
    expect("https://gitlab.com/-/snippets/1234".match(match)).toBeTruthy();
    expect(
      "https://gitlab.com/gitlab-org/gitlab/-/snippets/2256824".match(match)
    ).toBeTruthy();
    expect(
      "https://gitlab.com/group/project/sub-project/sub-sub-project/test/-/snippets/9876".match(
        match
      )
    ).toBeTruthy();
  });

  test("to not be enabled elsewhere", () => {
    expect("https://gitlab.com".match(match)).toBe(null);
    expect("https://gitlab.com/gitlab-org".match(match)).toBe(null);
    expect("https://gitlab.com/gitlab-org/gitlab".match(match)).toBe(null);
    expect("https://gitlab.com/gitlab-org/gitlab/-/issues".match(match)).toBe(
      null
    );
    expect(
      "https://gitlab.com/gitlab-org/gitlab/-/merge_requests/137948".match(
        match
      )
    ).toBe(null);
  });
});
