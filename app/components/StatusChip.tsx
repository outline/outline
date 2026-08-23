import styled from "styled-components";
import { s } from "@shared/styles";
/** Tones a status can be rendered in. */
type Tone = "positive" | "pending" | "neutral" | "negative";
const TONES: Record<string, Tone> = {
  active: "positive",
  paid: "positive",
  checked_in: "positive",
  received: "positive",
  booked: "pending",
  draft: "pending",
  ordered: "pending",
  on_leave: "pending",
  partial: "pending",
  in: "positive",
  out: "negative",
  transfer: "neutral",
  adjustment: "pending",
  full: "negative",
  free: "positive",
  critical: "negative",
  warning: "pending",
  info: "neutral",
  unpaid: "negative",
  void: "neutral",
  checked_out: "neutral",
  archived: "neutral",
  inactive: "neutral",
  refunded: "neutral",
  cancelled: "negative",
};
const Chip = styled.span<{
  $tone: Tone;
}>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;
  color: ${({ $tone, theme }) =>
    $tone === "positive"
      ? theme.success
      : $tone === "pending"
        ? theme.warning
        : $tone === "negative"
          ? theme.danger
          : theme.textTertiary};
  background: ${({ $tone, theme }) =>
    $tone === "positive"
      ? `${theme.success}1a`
      : $tone === "pending"
        ? `${theme.warning}1a`
        : $tone === "negative"
          ? `${theme.danger}1a`
          : s("backgroundSecondary")({ theme })};
`;
/**
 * A status pill using the app's own theme colours, so pet store records read
 * the same as the rest of Outline rather than carrying their own palette.
 *
 * @param status the record status.
 * @returns the rendered chip.
 */
export function StatusChip({ status }: { status: string }) {
  return (
    <Chip $tone={TONES[status] ?? "neutral"}>{status.replace(/_/g, " ")}</Chip>
  );
}
