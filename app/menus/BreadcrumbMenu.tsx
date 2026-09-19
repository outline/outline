import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { useMenuAction } from "~/hooks/useMenuAction";
import type { InternalLinkAction } from "~/types";

type Props = {
  actions: InternalLinkAction[];
};

export default function BreadcrumbMenu({ actions }: Props) {
  const { t } = useTranslation();

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} ariaLabel={t("Show path to document")}>
      <Button />
    </DropdownMenu>
  );
}

const Button = styled(OverflowMenuButton)`
  && {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    margin-inline: -4px;
    transition: background 100ms ease-in-out;
  }

  &&:hover,
  &&[data-state="open"] {
    background: ${s("buttonNeutralHoverBackground")};
    transition: none;
  }
`;
