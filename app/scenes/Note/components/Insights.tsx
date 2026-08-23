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
import type Note from "~/models/Note";
import { useFormatNumber } from "~/hooks/useFormatNumber";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";
import { useLayoutEffect, useRef } from "react";
type Props = {
  note: Note;
};
function Insights({ note }: Props) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedText = useTextSelection();
  const text = ProsemirrorHelper.toPlainText(note);
  const stats = useTextStats(text ?? "", selectedText);
  const formatNumber = useFormatNumber();
  // Move focus into the modal to account for lazy-loading
  useLayoutEffect(() => {
    wrapperRef.current?.focus();
  }, []);
  return (
    <div ref={wrapperRef} tabIndex={-1}>
      {note ? (
        <Flex
          column
          shrink={false}
          style={{ minHeight: "100%" }}
          justify="space-between"
        >
          <div>
            <Flex column>
              <Text as="h2" size="large">
                {t("Source")}
              </Text>
              <Text as="p" type="secondary" size="small">
                <List>
                  <li>
                    {t("Created")} <Time dateTime={note.createdAt} addSuffix />
                  </li>
                  <li>
                    {t(`Last updated`)}{" "}
                    <Time dateTime={note.updatedAt} addSuffix />
                  </li>
                  {(note.sourceName || note.sourceMetadata?.fileName) && (
                    <li>
                      {t("Imported from {{ source }}", {
                        source:
                          note.sourceName ??
                          `“${note.sourceMetadata?.fileName}”`,
                      })}
                    </li>
                  )}
                </List>
              </Text>

              <Text as="h2" size="large">
                {t("Stats")}
              </Text>
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
                  {stats.selected.characters === 0 ? (
                    <li>{t("No text selected")}</li>
                  ) : (
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
            </Flex>

            <Flex column>
              <Text as="h2" size="large">
                {t("Contributors")}
              </Text>
              <ListSpacing>
                {note.sourceMetadata?.createdByName && (
                  <ListItem
                    title={note.sourceMetadata?.createdByName}
                    image={
                      <Avatar
                        model={{
                          color: stringToColor(
                            note.sourceMetadata.createdByName
                          ),
                          avatarUrl: null,
                          initial: note.sourceMetadata.createdByName[0],
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
                  items={note.collaborators}
                  renderItem={(model) => (
                    <ListItem
                      key={model.id}
                      title={model.name}
                      image={<Avatar model={model} size={AvatarSize.Large} />}
                      subtitle={
                        model.id === note.createdBy?.id
                          ? note.sourceMetadata?.createdByName
                            ? t("Imported")
                            : t("Creator")
                          : model.id === note.updatedBy?.id
                            ? t("Last edited")
                            : t("Previously edited")
                      }
                      border={false}
                      small
                    />
                  )}
                />
              </ListSpacing>
            </Flex>
          </div>
        </Flex>
      ) : null}
    </div>
  );
}
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
