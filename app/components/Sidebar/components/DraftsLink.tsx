import { observer } from "mobx-react";
import { DraftsIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import * as Scenes from "~/routes/scenes";
import { popIn } from "~/styles/animations";
import { draftsPath } from "~/utils/routeHelpers";
import { useDropToUnpublish } from "../hooks/useDragAndDrop";
import SidebarLink from "./SidebarLink";

export const DraftsLink = observer(() => {
  const { t } = useTranslation();
  const { documents } = useStores();
  const [{ isOver, canDrop }, dropRef] = useDropToUnpublish();
  const totalDrafts =
    documents.totalDrafts > 25 ? "25+" : String(documents.totalDrafts);

  return (
    <div ref={dropRef}>
      <SidebarLink
        to={draftsPath()}
        onClickIntent={Scenes.Drafts.preload}
        icon={<DraftsIcon />}
        label={
          <Flex align="center" justify="space-between">
            {t("Drafts")}
            {documents.totalDrafts > 0 ? (
              <Drafts key={totalDrafts} size="xsmall" type="tertiary">
                {totalDrafts}
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
  display: inline-block;
  margin: 0 4px;
  animation: ${popIn} 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
`;
