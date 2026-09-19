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
import type Document from "~/models/Document";
import { useLayoutEffect, useRef } from "react";

type Props = {
  document: Document;
};

function Insights({ document }: Props) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Move focus into the modal to account for lazy-loading
  useLayoutEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  return (
    <div ref={wrapperRef} tabIndex={-1}>
      {document ? (
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
            </Flex>

            <Flex column>
              <Text as="h2" size="large">
                {t("Contributors")}
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
