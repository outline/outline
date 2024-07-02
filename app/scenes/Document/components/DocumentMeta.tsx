import { LocationDescriptor } from "history";
import { observer, useObserver } from "mobx-react";
import { CommentIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link, useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import { TeamPreference } from "@shared/types";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import DocumentMeta from "~/components/DocumentMeta";
import Fade from "~/components/Fade";
import Input from "~/components/Input";
import InputSelect from "~/components/InputSelect";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { Feature, FeatureFlags } from "~/utils/FeatureFlags";
import { documentPath, documentInsightsPath } from "~/utils/routeHelpers";

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
  const [draftAttribute, setDraftAttribute] = React.useState<{
    dataAttributeId: string;
    value: string;
  } | null>(null);

  const Wrapper = viewsLoadedOnMount.current ? React.Fragment : Fade;

  const insightsPath = documentInsightsPath(document);
  const commentsCount = comments.unresolvedCommentsInDocumentCount(document.id);

  const hasDataAttributes =
    FeatureFlags.isEnabled(Feature.dataAttributes) &&
    dataAttributes.orderedData.length > 0;

  const addProperty = (
    <InlineLink
      to={documentPath(document)}
      onClick={() => setDraftAttribute((state) => (state ? null : {}))}
    >
      <PlusIcon size={18} /> Property
    </InlineLink>
  );

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
        {hasDataAttributes && document.dataAttributes.length === 0 ? (
          <>&nbsp;•&nbsp;{addProperty}</>
        ) : null}
      </Meta>
      <Properties>
        {document.dataAttributes?.map((dataAttribute) => {
          const definition = dataAttributes.get(dataAttribute.dataAttributeId);
          return (
            <div key={dataAttribute.dataAttributeId}>
              <Text type="tertiary" weight="bold">
                {definition?.name}:
              </Text>{" "}
              <Text type="tertiary">{dataAttribute.value}</Text>
            </div>
          );
        })}
        {document.dataAttributes.length > 1 && addProperty}
        {draftAttribute && (
          <Flex gap={8} auto>
            <InputSelect
              ariaLabel="Type"
              options={dataAttributes.orderedData.map((attribute) => ({
                label: attribute.name,
                value: attribute.id,
              }))}
              value={
                draftAttribute?.dataAttributeId ??
                dataAttributes.orderedData[0].id
              }
              onChange={(dataAttributeId) =>
                setDraftAttribute({ ...draftAttribute, dataAttributeId })
              }
            />

            <Input
              placeholder="Value"
              value={draftAttribute?.value ?? ""}
              onBlur={async () => {
                if (draftAttribute.value) {
                  document.setDataAttribute(
                    draftAttribute.dataAttributeId,
                    draftAttribute.value
                  );
                  await document.save();
                }
              }}
              onChange={(event) =>
                setDraftAttribute({
                  ...draftAttribute,
                  value: event.target.value,
                })
              }
            />
          </Flex>
        )}
      </Properties>
    </>
  );
}

const Properties = styled.div`
  margin-top: -1.9em;
  margin-bottom: 2em;
  font-size: 14px;
  position: relative;
`;

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
