import { addDays, endOfDay } from "date-fns";

export enum ExpiryType {
  Week = "7 days",
  Month = "30 days",
  TwoMonths = "60 days",
  ThreeMonths = "90 days",
  Custom = "Custom",
  NoExpiration = "No expiration",
}

const ExpiryValues: Map<ExpiryType, number> = new Map([
  [ExpiryType.Week, 7],
  [ExpiryType.Month, 30],
  [ExpiryType.TwoMonths, 60],
  [ExpiryType.ThreeMonths, 90],
]);

export const calculateExpiryDate = (
  currentDate: Date,
  expiryType: ExpiryType
): Date | undefined => {
  if (
    expiryType === ExpiryType.Custom ||
    expiryType === ExpiryType.NoExpiration
  ) {
    return;
  }
  const expiryDate = addDays(currentDate, ExpiryValues.get(expiryType)!);
  return endOfDay(expiryDate);
};
