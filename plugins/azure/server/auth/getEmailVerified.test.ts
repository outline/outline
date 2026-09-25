import { getEmailVerified } from "./getEmailVerified";

describe("getEmailVerified", () => {
  const email = "victim@example.com";
  const userPrincipalName = "attacker@attacker.onmicrosoft.com";

  it("does not trust an email claim copied from an editable mail attribute", () => {
    expect(
      getEmailVerified(email, { email }, userPrincipalName)
    ).toBeUndefined();
  });

  it("does not trust a Graph mail fallback without a token email", () => {
    expect(getEmailVerified(email, {}, userPrincipalName)).toBeUndefined();
  });

  it("does not trust an email without a UPN or verification claims", () => {
    expect(getEmailVerified(email, { email })).toBeUndefined();
  });

  it("trusts an address matching the UPN, ignoring case", () => {
    expect(getEmailVerified(email, { email }, email.toUpperCase())).toBe(true);
  });

  it("trusts a UPN fallback without a token email", () => {
    expect(getEmailVerified(email, {}, email)).toBe(true);
  });

  it("does not trust another address on the same UPN domain", () => {
    expect(
      getEmailVerified(email, { email }, "someone@example.com")
    ).toBeUndefined();
  });
});
