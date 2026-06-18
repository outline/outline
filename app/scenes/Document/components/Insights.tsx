import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import { stringToColor } from "@shared/utils/color";
import type User from "~/models/User";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import ListItem from "~/components/List/Item";
import PaginatedList from "~/components/PaginatedList";
import Text from "~/components/Text";
import Time from "~/components/Time";
import useTextSelection from "~/hooks/useTextSelection";
import { useTextStats } from "~/hooks/useTextStats";
import type Document from "~/models/Document";
import { useFormatNumber } from "~/hooks/useFormatNumber";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";
import { useLayoutEffect, useRef } from "react";
import InsightsChart from "./InsightsChart";

type Props = {
  document: Document;
};

function Insights({ document }: Props) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedText = useTextSelection();
  const text = ProsemirrorHelper.toPlainText(document);
  const stats = useTextStats(text ?? "", selectedText);
  const formatNumber = useFormatNumber();

  // Move focus into the modal to account for lazy-loading
  useLayoutEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  return (
    <div ref={wrapperRef} tabIndex={-1} style={{ outline: "none" }}>
      {document ? (
        <Flex column shrink={false}>
          <Columns>
            <Column column>
              <Heading as="h3" type="tertiary">
                {t("Information")}
              </Heading>
              <Text as="p" type="secondary" size="small">
                <List>
                  <li>
                    {t("Created")}{" "}
                    <Time dateTime={document.createdAt} addSuffix />
                  </li>
                  <li>
                    {t(`Last updated`)}{" "}
                    <Time dateTime={document.updatedAt} addSuffix />
                  </li>
                  {(document.sourceName ||
                    document.sourceMetadata?.fileName) && (
                    <li>
                      {t("Imported from {{ source }}", {
                        source:
                          document.sourceName ??
                          `“${document.sourceMetadata?.fileName}”`,
                      })}
                    </li>
                  )}
                </List>
              </Text>

              <Heading as="h3" type="tertiary">
                {t("Statistics")}
              </Heading>
              <Text as="p" type="secondary" size="small">
                <List>
                  {stats.total.words > 0 && (
                    <li>
                      {t(`{{ number }} minute read`, {
                        number: formatNumber(stats.total.readingTime),
                      })}
                    </li>
                  )}
                  <li>
                    {t(`{{ number }} words`, {
                      count: stats.total.words,
                      number: formatNumber(stats.total.words),
                    })}
                  </li>
                  <li>
                    {t(`{{ number }} characters`, {
                      count: stats.total.characters,
                      number: formatNumber(stats.total.characters),
                    })}
                  </li>
                  <li>
                    {t(`{{ number }} emoji`, {
                      number: formatNumber(stats.total.emoji),
                    })}
                  </li>
                  {stats.selected.characters > 0 && (
                    <>
                      <li>
                        {t(`{{ number }} words selected`, {
                          count: stats.selected.words,
                          number: formatNumber(stats.selected.words),
                        })}
                      </li>
                      <li>
                        {t(`{{ number }} characters selected`, {
                          count: stats.selected.characters,
                          number: formatNumber(stats.selected.characters),
                        })}
                      </li>
                    </>
                  )}
                </List>
              </Text>
            </Column>

            <Column column>
              <Heading as="h3" type="tertiary">
                {t("Contributors")}
              </Heading>
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
                <PaginatedList<User>
                  aria-label={t("Contributors")}
                  items={document.collaborators}
                  renderItem={(model) => (
                    <ListItem
                      key={model.id}
                      title={model.name}
                      image={<Avatar model={model} size={AvatarSize.Large} />}
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
            </Column>
          </Columns>

          <InsightsChart document={document} />
        </Flex>
      ) : null}
    </div>
  );
}

const Columns = styled("div")`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 16px;
`;

const Column = styled(Flex)`
  min-width: 0;
`;

const Heading = styled(Text)`
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const ListSpacing = styled("div")`
  margin-top: -0.5em;
  margin-bottom: 0.5em;
`;

const List = styled("ul")`
  margin: 0 0 1em;
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

export default observer(Insights);
