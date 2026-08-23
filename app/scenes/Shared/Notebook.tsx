import { observer } from "mobx-react";
import { EditIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { IconTitleWrapper } from "@shared/components/Icon";
import useShare from "@shared/hooks/useShare";
import type NotebookModel from "~/models/Notebook";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import CenteredContent from "~/components/CenteredContent";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import CollectionIcon from "~/components/Icons/NotebookIcon";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import Time from "~/components/Time";
import Tooltip from "~/components/Tooltip";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import { notebookPath } from "~/utils/routeHelpers";
import Overview from "../Notebook/components/Overview";
import { AppearanceAction } from "~/components/Sharing/components/Actions";
type Props = {
  notebook: NotebookModel;
};
function SharedNotebook({ notebook }: Props) {
  const { t } = useTranslation();
  const { shareId, showLastUpdated } = useShare();
  const can = usePolicy(notebook);
  const isMobile = useMobile();
  const editAction = (
    <Action>
      <Tooltip content={t("Edit notebook")} shortcut="e" placement="bottom">
        <Button
          as={Link}
          icon={<EditIcon />}
          to={{
            pathname: notebookPath(notebook, "overview"),
          }}
          aria-label={t("Edit notebook")}
          neutral
        >
          {isMobile ? null : t("Edit")}
        </Button>
      </Tooltip>
    </Action>
  );
  return (
    <Scene
      centered={false}
      textTitle={notebook.name}
      left={<div />}
      title={
        <>
          <CollectionIcon notebook={notebook} expanded />
          &nbsp;{notebook.name}
        </>
      }
      actions={
        <>
          <AppearanceAction />
          {can.update ? editAction : null}
        </>
      }
    >
      <CenteredContent withStickyHeader>
        <Flex column>
          <NotebookHeading>
            <IconTitleWrapper>
              <CollectionIcon notebook={notebook} size={40} expanded />
            </IconTitleWrapper>
            {notebook.name}
          </NotebookHeading>
          {!!shareId && showLastUpdated && !!notebook.updatedAt ? (
            <SharedMeta type="tertiary">
              {t("Last updated")}{" "}
              <Time dateTime={notebook.updatedAt} addSuffix />
            </SharedMeta>
          ) : null}
        </Flex>
        <Overview notebook={notebook} key={notebook.id} readOnly />
      </CenteredContent>
    </Scene>
  );
}
const NotebookHeading = styled(Heading)`
  display: flex;
  align-items: center;
  position: relative;
  margin-left: 40px;

  ${breakpoint("tablet")`
    margin-left: 0;
  `}
`;
const SharedMeta = styled(Text)`
  margin: -12px 0 2em 0;
  font-size: 14px;
`;
export const Notebook = observer(SharedNotebook);
