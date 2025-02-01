import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { stringToColor } from "@shared/utils/color";
import User from "~/models/User";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { useDocumentContext } from "~/components/DocumentContext";
import DocumentViews from "~/components/DocumentViews";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import PaginatedList from "~/components/PaginatedList";
import Text from "~/components/Text";
import Time from "~/components/Time";
import useKeyDown from "~/hooks/useKeyDown";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useTextSelection from "~/hooks/useTextSelection";
import { useTextStats } from "~/hooks/useTextStats";
import InsightsMenu from "~/menus/InsightsMenu";
import { documentPath } from "~/utils/routeHelpers";
import Sidebar from "./SidebarLayout";

function Insights() {
  const { views, documents } = useStores();
  const { t } = useTranslation();
  const match = useRouteMatch<{ documentSlug: string }>();
  const history = useHistory();
  const sidebarContext = useLocationSidebarContext();
  const selectedText = useTextSelection();
  const document = documents.getByUrl(match.params.documentSlug);
  const { editor } = useDocumentContext();
  const text = editor?.getPlainText();
  const stats = useTextStats(text ?? "", selectedText);
  const can = usePolicy(document);
  const documentViews = document ? views.inDocument(document.id) : [];

  const onCloseInsights = () => {
    if (document) {
      history.push({
        pathname: documentPath(document),
        state: { sidebarContext },
      });
    }
  };

  useKeyDown("Escape", onCloseInsights);

  return (
    <Sidebar title={t("Insights")} onClose={onCloseInsights}>
      {document ? (
        <Flex
          column
          shrink={false}
          style={{ minHeight: "100%" }}
          justify="space-between"
        >
          <div>
            <Content column>
              {document.sourceMetadata && (
                <>
                  <Heading>{t("Source")}</Heading>
                  {
                    <Text as="p" type="secondary" size="small">
                      {t("Imported from {{ source }}", {
                        source:
                          document.sourceName ??
                          `“${document.sourceMetadata.fileName}”`,
                      })}
                    </Text>
                  }
                </>
              )}
              <Heading>{t("Stats")}</Heading>
              <Text as="p" type="secondary" size="small">
                <List>
                  {stats.total.words > 0 && (
                    <li>
                      {t(`{{ count }} minute read`, {
                        count: stats.total.readingTime,
                      })}
                    </li>
                  )}
                  <li>
                    {t(`{{ count }} words`, { count: stats.total.words })}
                  </li>
                  <li>
                    {t(`{{ count }} characters`, {
                      count: stats.total.characters,
                    })}
                  </li>
                  <li>
                    {t(`{{ number }} emoji`, { number: stats.total.emoji })}
                  </li>
                  {stats.selected.characters === 0 ? (
                    <li>{t("No text selected")}</li>
                  ) : (
                    <>
                      <li>
                        {t(`{{ count }} words selected`, {
                          count: stats.selected.words,
                        })}
                      </li>
                      <li>
                        {t(`{{ count }} characters selected`, {
                          count: stats.selected.characters,
                        })}
                      </li>
                    </>
                  )}
                </List>
              </Text>
            </Content>

            <Content column>
              <Heading>{t("Contributors")}</Heading>
              <Text as="p" type="secondary" size="small">
                {t(`Created`)} <Time dateTime={document.createdAt} addSuffix />.
                <br />
                {t(`Last updated`)}{" "}
                <Time dateTime={document.updatedAt} addSuffix />.
              </Text>
              <ListSpacing>
                {document.sourceMetadata?.createdByName && (
                  <ListItem
                    title={document.sourceMetadata?.createdByName}
                    image={
                      <Avatar
                        model={{
                          color: stringToColor(
                            document.sourceMetadata.createdByName
                          ),
                          avatarUrl: null,
                          initial: document.sourceMetadata.createdByName[0],
                        }}
                        size={AvatarSize.Large}
                      />
                    }
                    subtitle={t("Creator")}
                    border={false}
                    small
                  />
                )}
                <PaginatedList
                  aria-label={t("Contributors")}
                  items={document.collaborators}
                  renderItem={(model: User) => (
                    <ListItem
                      key={model.id}
                      title={model.name}
                      image={<Avatar model={model} size={32} />}
                      subtitle={
                        model.id === document.createdBy?.id
                          ? document.sourceMetadata?.createdByName
                            ? t("Imported")
                            : t("Creator")
                          : model.id === document.updatedBy?.id
                          ? t("Last edited")
                          : t("Previously edited")
                      }
                      border={false}
                      small
                    />
                  )}
                />
              </ListSpacing>
            </Content>
            {(document.insightsEnabled || can.updateInsights) && (
              <Content column>
                <Heading>
                  <Flex justify="space-between">
                    {t("Viewed by")}
                    {can.updateInsights && <InsightsMenu />}
                  </Flex>
                </Heading>
                {document.insightsEnabled ? (
                  <>
                    <Text as="p" type="secondary" size="small">
                      {documentViews.length <= 1
                        ? t("No one else has viewed yet")
                        : t(
                            `Viewed {{ count }} times by {{ teamMembers }} people`,
                            {
                              count: documentViews.reduce(
                                (memo, view) => memo + view.count,
                                0
                              ),
                              teamMembers: documentViews.length,
                            }
                          )}
                      .
                    </Text>
                    {documentViews.length > 1 && (
                      <ListSpacing>
                        <DocumentViews document={document} isOpen />
                      </ListSpacing>
                    )}
                  </>
                ) : (
                  <Text as="p" type="secondary" size="small">
                    {t("Viewer insights are disabled.")}
                  </Text>
                )}
              </Content>
            )}
          </div>
        </Flex>
      ) : null}
    </Sidebar>
  );
}

const ListSpacing = styled("div")`
  margin-top: -0.5em;
  margin-bottom: 0.5em;
`;

const List = styled("ul")`
  margin: 0;
  padding: 0;
  list-style: none;

  li:before {
    content: "·";
    display: inline-block;
    font-weight: 600;
    color: ${s("textTertiary")};
    width: 10px;
  }
`;

const Content = styled(Flex)`
  padding: 0 16px;
  user-select: none;
`;

const Heading = styled("h3")`
  font-size: 15px;
`;

export default observer(Insights);
