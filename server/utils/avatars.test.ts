import { generateAvatarUrl } from "./avatars";

it("should return null as Clearbit API is discontinued", async () => {
  const url = await generateAvatarUrl({
    id: "google",
    domain: "google.com",
  });
  expect(url).toBe(null);
});
