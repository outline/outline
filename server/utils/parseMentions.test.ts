import { buildDocument } from "@server/test/factories";
import parseMentions from "./parseMentions";

it("should not parse normal links as mentions", async () => {
  const document = await buildDocument({
    text: `# Header

[link not mention](http://google.com)`,
  });
  const result = parseMentions(document);
  expect(result.length).toBe(0);
});

it("should return an array of mentions", async () => {
  const document = await buildDocument({
    text: `# Header

@[Alan Kay](mention://user/34095ac1-c808-45c0-8c6e-6c554497de64) :wink:

More text

@[Bret Victor](mention://user/2767ba0e-ac5c-4533-b9cf-4f5fc456600e) :fire:`,
  });
  const result = parseMentions(document);
  expect(result.length).toBe(2);
  expect(result[0].modelId).toBe("34095ac1-c808-45c0-8c6e-6c554497de64");
  expect(result[1].modelId).toBe("2767ba0e-ac5c-4533-b9cf-4f5fc456600e");
});
