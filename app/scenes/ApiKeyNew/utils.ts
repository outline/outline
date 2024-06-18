import { addDays, endOfDay } from "date-fns";
import i18next from "i18next";

export enum ExpiryType {
  Week = "7 days",
  Month = "30 days",
  TwoMonths = "60 days",
  ThreeMonths = "90 days",
  Custom = "Custom",
  NoExpiration = "No expiration",
}

type ExpiryValue = {
  label: string;
  value?: number;
};

export const ExpiryValues: Map<ExpiryType, ExpiryValue> = new Map([
  [ExpiryType.Week, { label: i18next.t("7 days"), value: 7 }],
  [ExpiryType.Month, { label: i18next.t("30 days"), value: 30 }],
  [ExpiryType.TwoMonths, { label: i18next.t("60 days"), value: 60 }],
  [ExpiryType.ThreeMonths, { label: i18next.t("90 days"), value: 90 }],
  [ExpiryType.Custom, { label: i18next.t("Custom") }],
  [ExpiryType.NoExpiration, { label: i18next.t("No expiration") }],
]);

export const calculateExpiryDate = (
  currentDate: Date,
  expiryType: ExpiryType
): Date | undefined => {
  const daysToAdd = ExpiryValues.get(expiryType)?.value;
  if (!daysToAdd) {
    return;
  }
  const expiryDate = addDays(currentDate, daysToAdd);
  return endOfDay(expiryDate);
};
