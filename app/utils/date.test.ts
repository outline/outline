import { addDays, endOfDay, subDays } from "date-fns";
import i18next from "i18next";
import { daysToExpiry } from "./date";

describe("daysToExpiry", () => {
  const instance = i18next.createInstance();

  beforeAll(async () => {
    await instance.init({ lng: "en_US", resources: {} });
  });

  it("should return the number of days until expiry", () => {
    const date = endOfDay(addDays(new Date(), 3)).toISOString();
    expect(daysToExpiry(date, instance.t)).toContain("3");
  });

  it("should return today when expiring today", () => {
    const date = endOfDay(new Date()).toISOString();
    expect(daysToExpiry(date, instance.t)).toEqual("Expires today");
  });

  it("should return expired when in the past", () => {
    const date = subDays(new Date(), 1).toISOString();
    expect(daysToExpiry(date, instance.t)).toEqual("Expired");
  });
});
