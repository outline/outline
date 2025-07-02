import { observer } from "mobx-react";
import { EditIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { IconTitleWrapper } from "@shared/components/Icon";
import CollectionModel from "~/models/Collection";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import CenteredContent from "~/components/CenteredContent";
import Heading from "~/components/Heading";
import CollectionIcon from "~/components/Icons/CollectionIcon";
import Scene from "~/components/Scene";
import Tooltip from "~/components/Tooltip";
import useMobile from "~/hooks/useMobile";
import usePolicy from "~/hooks/usePolicy";
import { collectionPath } from "~/utils/routeHelpers";
import Overview from "../Collection/components/Overview";

type Props = {
  collection: CollectionModel;
  shareId: string;
};

function SharedCollection({ collection, shareId }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(collection);
  const isMobile = useMobile();

  const editAction = (
    <Action>
      <Tooltip content={t("Edit collection")} shortcut="e" placement="bottom">
        <Button
          as={Link}
          icon={<EditIcon />}
          to={{
            pathname: collectionPath(collection.path, "overview"),
          }}
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
      textTitle={collection.name}
      left={<div />}
      title={
        <>
          <CollectionIcon collection={collection} expanded />
          &nbsp;{collection.name}
        </>
      }
      actions={can.update ? editAction : <div />}
    >
      <CenteredContent withStickyHeader>
        <CollectionHeading>
          <IconTitleWrapper>
            <CollectionIcon collection={collection} size={40} expanded />
          </IconTitleWrapper>
          {collection.name}
        </CollectionHeading>
        <Overview collection={collection} shareId={shareId} />
      </CenteredContent>
    </Scene>
  );
}

const CollectionHeading = styled(Heading)`
  display: flex;
  align-items: center;
  position: relative;
  margin-left: 40px;

  ${breakpoint("tablet")`
    margin-left: 0;
  `}
`;

export const Collection = observer(SharedCollection);
