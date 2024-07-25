import { LocationDescriptor } from "history";
import { observer, useObserver } from "mobx-react";
import { CommentIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useRouteMatch } from "react-router-dom";
import { MenuButton, useMenuState } from "reakit";
import styled from "styled-components";
import { TeamPreference } from "@shared/types";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import DocumentMeta from "~/components/DocumentMeta";
import Fade from "~/components/Fade";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { DataAttributesHelper } from "~/utils/DataAttributesHelper";
import { documentPath, documentInsightsPath } from "~/utils/routeHelpers";
import { Properties, PropertiesRef } from "./Properties";

type Props = {
  /* The document to display meta data for */
  document: Document;
  revision?: Revision;
  to?: LocationDescriptor;
  rtl?: boolean;
};

function TitleDocumentMeta({ to, document, revision, ...rest }: Props) {
  const { views, comments, dataAttributes, ui } = useStores();
  const { t } = useTranslation();
  const match = useRouteMatch();
  const team = useCurrentTeam();
  const documentViews = useObserver(() => views.inDocument(document.id));
  const totalViewers = documentViews.length;
  const onlyYou = totalViewers === 1 && documentViews[0].userId;
  const viewsLoadedOnMount = React.useRef(totalViewers > 0);
  const can = usePolicy(document);
  const canTeam = usePolicy(team);
  const propertiesRef = React.useRef<PropertiesRef>(null);

  const Wrapper = viewsLoadedOnMount.current ? React.Fragment : Fade;

  const insightsPath = documentInsightsPath(document);
  const commentsCount = comments.unresolvedCommentsInDocumentCount(document.id);

  const dataAttributesAvailable =
    canTeam.listDataAttribute && dataAttributes.orderedData.length > 0;
  const missingDataAttributes =
    !document.dataAttributes ||
    document.dataAttributes?.length < dataAttributes.orderedData.length;

  return (
    <>
      <Meta document={document} revision={revision} to={to} replace {...rest}>
        {team.getPreference(TeamPreference.Commenting) && can.comment && (
          <>
            &nbsp;•&nbsp;
            <InlineLink
              to={documentPath(document)}
              onClick={() => ui.toggleComments(document.id)}
            >
              <CommentIcon size={18} />
              {commentsCount
                ? t("{{ count }} comment", { count: commentsCount })
                : t("Comment")}
            </InlineLink>
          </>
        )}
        {dataAttributesAvailable && missingDataAttributes && can.update ? (
          <>
            &nbsp;•&nbsp;
            <AddPropertyMenu
              document={document}
              propertiesRef={propertiesRef}
            />
          </>
        ) : null}
        {totalViewers &&
        can.listViews &&
        !document.isDraft &&
        !document.isTemplate ? (
          <Wrapper>
            &nbsp;•&nbsp;
            <Link
              to={
                match.url === insightsPath
                  ? documentPath(document)
                  : insightsPath
              }
            >
              {t("Viewed by")}{" "}
              {onlyYou
                ? t("only you")
                : `${totalViewers} ${
                    totalViewers === 1 ? t("person") : t("people")
                  }`}
            </Link>
          </Wrapper>
        ) : null}
      </Meta>
      <Properties document={document} ref={propertiesRef} />
    </>
  );
}

const AddPropertyMenu = ({
  propertiesRef,
  document,
}: {
  document: Document;
  propertiesRef: React.RefObject<PropertiesRef>;
}) => {
  const { dataAttributes } = useStores();
  const { t } = useTranslation();
  const menu = useMenuState({
    modal: true,
  });

  return (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <InlineLink to={documentPath(document)} {...props}>
            <PlusIcon size={18} /> {t("Property")}
          </InlineLink>
        )}
      </MenuButton>
      <ContextMenu {...menu}>
        {dataAttributes.orderedData
          .filter(
            (a) =>
              !a.deletedAt &&
              !document.dataAttributes?.find((d) => d.dataAttributeId === a.id)
          )
          .map((attribute) => (
            <MenuItem
              key={attribute.id}
              icon={DataAttributesHelper.getIcon(
                attribute.dataType,
                attribute.name
              )}
              {...menu}
              onClick={() => propertiesRef.current?.addProperty(attribute.id)}
            >
              {attribute.name}
            </MenuItem>
          ))}
      </ContextMenu>
    </>
  );
};

const InlineLink = styled(Link)`
  display: inline-flex;
  align-items: center;
`;

export const Meta = styled(DocumentMeta)<{ rtl?: boolean }>`
  justify-content: ${(props) => (props.rtl ? "flex-end" : "flex-start")};
  margin: -12px 0 2em 0;
  font-size: 14px;
  position: relative;
  user-select: none;
  z-index: 1;

  a {
    color: inherit;
    cursor: var(--pointer);

    &:hover {
      text-decoration: underline;
    }
  }

  @media print {
    display: none;
  }
`;

export default observer(TitleDocumentMeta);
