import { generateAvatarUrl } from "./avatars";

it("should return clearbit url if available", async () => {
  const url = await generateAvatarUrl({
    id: "google",
    domain: "google.com",
    name: "Google",
  });
  expect(url).toBe("https://logo.clearbit.com/google.com");
});
it("should return tiley url if clearbit unavailable", async () => {
  const url = await generateAvatarUrl({
    id: "invalid",
    domain: "example.invalid",
    name: "Invalid",
  });
  expect(url).toBe(
    "https://tiley.herokuapp.com/avatar/f1234d75178d892a133a410355a5a990cf75d2f33eba25d575943d4df632f3a4/I.png"
  );
});
it("should return tiley url if domain not provided", async () => {
  const url = await generateAvatarUrl({
    id: "google",
    name: "Google",
  });
  expect(url).toBe(
    "https://tiley.herokuapp.com/avatar/bbdefa2950f49882f295b1285d4fa9dec45fc4144bfb07ee6acc68762d12c2e3/G.png"
  );
});
it("should return tiley url if name not provided", async () => {
  const url = await generateAvatarUrl({
    id: "google",
  });
  expect(url).toBe(
    "https://tiley.herokuapp.com/avatar/bbdefa2950f49882f295b1285d4fa9dec45fc4144bfb07ee6acc68762d12c2e3/U.png"
  );
});
it("should return tiley url with encoded name", async () => {
  const url = await generateAvatarUrl({
    id: "google",
    name: "株",
  });
  expect(url).toBe(
    "https://tiley.herokuapp.com/avatar/bbdefa2950f49882f295b1285d4fa9dec45fc4144bfb07ee6acc68762d12c2e3/%E6%A0%AA.png"
  );
});
