import * as React from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Switch from "~/components/Switch";
import SettingRow from "~/scenes/Settings/components/SettingRow";
import { EnterpriseBadge } from "./EnterpriseBadge";

type Props = {
  /** A unique name for the row, used to associate the label. */
  name: string;
  /** The label of the setting. */
  label: React.ReactNode;
  /** An optional description of what the setting does. */
  description?: React.ReactNode;
  /** Whether to render a bottom border (default: true). */
  border?: boolean;
  /**
   * The kind of control to render in a locked state. A "switch" mimics a
   * toggleable preference, while "none" renders only the badge (default: "switch").
   */
  control?: "switch" | "none";
};

/**
 * An upsell variant of `SettingRow` that mirrors an Enterprise-only setting in a
 * locked state. The control is disabled and an "Enterprise" badge is shown to
 * indicate that the setting can be unlocked by upgrading.
 *
 * @param props - The component props.
 * @returns The rendered, non-interactive setting row.
 */
export function UpsellSettingRow({
  name,
  label,
  description,
  border,
  control = "switch",
}: Props) {
  return (
    <SettingRow
      name={name}
      label={label}
      description={description}
      border={border}
    >
      <LockedControl align="center" gap={8}>
        <EnterpriseBadge />
        {control === "switch" && (
          <Switch id={name} name={name} checked={false} disabled />
        )}
      </LockedControl>
    </SettingRow>
  );
}

const LockedControl = styled(Flex)`
  opacity: 0.8;
`;
