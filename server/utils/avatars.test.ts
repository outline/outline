import { generateAvatarUrl } from "./avatars";

it("should return clearbit url if available", async () => {
  const url = await generateAvatarUrl({
    id: "google",
    domain: "google.com",
  });
  expect(url).toBe("https://logo.clearbit.com/google.com");
});
