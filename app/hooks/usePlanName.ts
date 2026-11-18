import { useTranslation } from "react-i18next";
import { Plan } from "@shared/types";

/**
 * Returns the translated display name of a plan.
 *
 * @param plan the plan to name.
 * @returns the display name of the plan.
 */
export function usePlanName(plan: Plan): string {
  const { t } = useTranslation();

  switch (plan) {
    case Plan.Community:
      return t("Community");
    case Plan.Standard:
      return t("Standard");
    case Plan.Business:
      return t("Business");
    case Plan.Enterprise:
      return t("Enterprise");
    case Plan.Legacy:
      return t("Legacy");
  }
}
