import { Plan, PlanFeature } from "../types";
import { PlanHelper } from "./PlanHelper";

describe("PlanHelper", () => {
  it("should define features for every plan", () => {
    for (const plan of Object.values(Plan)) {
      expect(PlanHelper.features[plan]).toBeDefined();
    }
  });

  it("should not offer the legacy plan", () => {
    expect(PlanHelper.plans).not.toContain(Plan.Legacy);
  });

  it("should check if a plan has a feature", () => {
    expect(PlanHelper.hasFeature(Plan.Community, PlanFeature.AuditLog)).toBe(
      false
    );
    expect(PlanHelper.hasFeature(Plan.Business, PlanFeature.AuditLog)).toBe(
      true
    );
  });

  it("should return the lowest plan with a feature", () => {
    expect(PlanHelper.getMinimumPlan(PlanFeature.AuditLog)).toBe(Plan.Business);
  });
});
