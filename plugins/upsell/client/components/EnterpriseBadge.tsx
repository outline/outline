import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Badge from "~/components/Badge";
import Tooltip from "~/components/Tooltip";

type Props = {
  /** Optional explanatory text shown in a tooltip on hover. */
  tooltip?: string;
};

/**
 * A small badge used to denote that a feature is only available in the
 * Enterprise edition of Outline.
 *
 * @param props - The component props.
 * @returns The rendered badge.
 */
export function EnterpriseBadge({ tooltip }: Props) {
  const { t } = useTranslation();
  const badge = <StyledBadge primary>{t("Enterprise")}</StyledBadge>;

  if (tooltip) {
    return (
      <Tooltip content={tooltip} placement="top">
        {badge}
      </Tooltip>
    );
  }

  return badge;
}

const StyledBadge = styled(Badge)`
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;
