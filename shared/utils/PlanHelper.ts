import { Plan, PlanFeature } from "../types";

/**
 * Describes the features that are included in each plan.
 */
export class PlanHelper {
  /** Plans that can be chosen, ordered from lowest to highest. */
  public static readonly plans: Plan[] = [
    Plan.Community,
    Plan.Standard,
    Plan.Business,
    Plan.Enterprise,
  ];

  /** The plan that a team gets when no other plan applies. */
  public static readonly defaultPlan = Plan.Community;

  /** The features that are included in each plan. */
  public static readonly features: Record<Plan, PlanFeature[]> = {
    [Plan.Community]: [],
    [Plan.Standard]: [PlanFeature.ContentManagement, PlanFeature.Guests],
    [Plan.Business]: Object.values(PlanFeature),
    [Plan.Enterprise]: Object.values(PlanFeature),
    [Plan.Legacy]: Object.values(PlanFeature),
  };

  /**
   * Get the features that are included in a plan.
   *
   * @param plan the plan to get the features for.
   * @returns the features included in the plan.
   */
  public static getFeatures(plan: Plan): PlanFeature[] {
    return this.features[plan] ?? [];
  }

  /**
   * Check if a plan includes a feature.
   *
   * @param plan the plan to check.
   * @param feature the feature to check for.
   * @returns true if the plan includes the feature.
   */
  public static hasFeature(plan: Plan, feature: PlanFeature): boolean {
    return this.getFeatures(plan).includes(feature);
  }

  /**
   * Get the lowest plan that can be chosen and includes a feature, for example to show in an upgrade prompt.
   *
   * @param feature the feature to find a plan for.
   * @returns the lowest plan that includes the feature, or undefined if no plan does.
   */
  public static getMinimumPlan(feature: PlanFeature): Plan | undefined {
    return this.plans.find((plan) => this.hasFeature(plan, feature));
  }
}
