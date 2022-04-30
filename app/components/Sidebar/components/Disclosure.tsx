import { CollapsedIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import NudeButton from "~/components/NudeButton";

type Props = {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  expanded: boolean;
  root?: boolean;
};

function Disclosure({ onClick, root, expanded, ...rest }: Props) {
  const { t } = useTranslation();

  return (
    <Button
      size={20}
      onClick={onClick}
      $root={root}
      aria-label={expanded ? t("Collapse") : t("Expand")}
      {...rest}
    >
      <StyledCollapsedIcon expanded={expanded} size={20} color="currentColor" />
    </Button>
  );
}

const Button = styled(NudeButton)<{ $root?: boolean }>`
  position: absolute;
  left: -24px;
  flex-shrink: 0;
  color: ${(props) => props.theme.textSecondary};

  &:hover {
    color: ${(props) => props.theme.text};
    background: ${(props) => props.theme.sidebarControlHoverBackground};
  }

  ${(props) =>
    props.$root &&
    css`
      opacity: 0;
      left: -16px;

      &:hover {
        opacity: 1;
        background: none;
      }
    `}
`;

const StyledCollapsedIcon = styled(CollapsedIcon)<{
  expanded?: boolean;
}>`
  transition: opacity 100ms ease, transform 100ms ease, fill 50ms !important;
  ${(props) => !props.expanded && "transform: rotate(-90deg);"};
`;

// Enables identifying this component within styled components
const StyledDisclosure = styled(Disclosure)``;

export default StyledDisclosure;
