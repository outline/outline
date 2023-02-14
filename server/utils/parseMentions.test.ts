import parseMentions from "./parseMentions";

it("should not parse normal links as mentions", () => {
  const result = parseMentions(
    `# Header

    [link not mention](http://google.com)`
  );
  expect(result.length).toBe(0);
});

it("should return an array of mention ids", () => {
  const result = parseMentions(`# Header

  @[Alan Kay](mention://user/34095ac1-c808-45c0-8c6e-6c554497de64) :wink:

  More text

  @[Bret Victor](mention://user/2767ba0e-ac5c-4533-b9cf-4f5fc456600e) :fire:
  `);
  expect(result.length).toBe(2);
  expect(result[0]).toBe("34095ac1-c808-45c0-8c6e-6c554497de64");
  expect(result[1]).toBe("2767ba0e-ac5c-4533-b9cf-4f5fc456600e");
});

it("should not return duplicate mention ids", () => {
  const result = parseMentions(`# Header

  @[Bret Victor](mention://user/2767ba0e-ac5c-4533-b9cf-4f5fc456600e) :fire:

  doing science...

  @[Bret Victor](mention://user/2767ba0e-ac5c-4533-b9cf-4f5fc456600e) :fire:

  copying...
  `);
  expect(result.length).toBe(1);
  expect(result[0]).toBe("2767ba0e-ac5c-4533-b9cf-4f5fc456600e");
});
