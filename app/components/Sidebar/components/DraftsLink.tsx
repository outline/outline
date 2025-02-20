import { observer } from "mobx-react";
import { DraftsIcon } from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { draftsPath } from "~/utils/routeHelpers";
import { useDropToUnpublish } from "../hooks/useDragAndDrop";
import SidebarLink from "./SidebarLink";

export const DraftsLink = observer(() => {
  const { t } = useTranslation();
  const { documents } = useStores();
  const [{ isOver, canDrop }, dropRef] = useDropToUnpublish();

  return (
    <div ref={dropRef}>
      <SidebarLink
        to={draftsPath()}
        icon={<DraftsIcon />}
        label={
          <Flex align="center" justify="space-between">
            {t("Drafts")}
            {documents.totalDrafts > 0 ? (
              <Drafts size="xsmall" type="tertiary">
                {documents.totalDrafts > 25 ? "25+" : documents.totalDrafts}
              </Drafts>
            ) : null}
          </Flex>
        }
        isActiveDrop={isOver && canDrop}
      />
    </div>
  );
});

const Drafts = styled(Text)`
  margin: 0 4px;
`;
