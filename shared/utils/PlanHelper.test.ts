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

  it("should include AI answers in business and legacy plans", () => {
    expect(PlanHelper.hasFeature(Plan.Standard, PlanFeature.AIAnswers)).toBe(
      false
    );
    expect(PlanHelper.hasFeature(Plan.Business, PlanFeature.AIAnswers)).toBe(
      true
    );
    expect(PlanHelper.hasFeature(Plan.Legacy, PlanFeature.AIAnswers)).toBe(
      true
    );
    expect(PlanHelper.getMinimumPlan(PlanFeature.AIAnswers)).toBe(
      Plan.Business
    );
  });

  it("should include data attributes in business and above", () => {
    expect(
      PlanHelper.hasFeature(Plan.Standard, PlanFeature.DataAttributes)
    ).toBe(false);
    expect(
      PlanHelper.hasFeature(Plan.Business, PlanFeature.DataAttributes)
    ).toBe(true);
    expect(
      PlanHelper.hasFeature(Plan.Enterprise, PlanFeature.DataAttributes)
    ).toBe(true);
    expect(PlanHelper.hasFeature(Plan.Legacy, PlanFeature.DataAttributes)).toBe(
      false
    );
    expect(PlanHelper.getMinimumPlan(PlanFeature.DataAttributes)).toBe(
      Plan.Business
    );
  });
});
