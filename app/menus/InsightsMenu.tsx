import { t } from "i18next";
import { MoreIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { s, hover } from "@shared/styles";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import NudeButton from "~/components/NudeButton";
import { toggleViewerInsights } from "~/actions/definitions/documents";
import { useMemo } from "react";
import { useMenuAction } from "~/hooks/useMenuAction";

const InsightsMenu: React.FC = () => {
  const actions = useMemo(() => [toggleViewerInsights], []);
  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} align="end" ariaLabel={t("Insights")}>
      <Button>
        <MoreIcon />
      </Button>
    </DropdownMenu>
  );
};

const Button = styled(NudeButton)`
  color: ${s("textSecondary")};

  &:${hover},
  &:active,
  &[data-state="open"] {
    color: ${s("text")};
    background: ${s("sidebarControlHoverBackground")};
  }
`;

export default InsightsMenu;
