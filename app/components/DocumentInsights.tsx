import emojiRegex from "emoji-regex";
import { m } from "framer-motion";
import { observer } from "mobx-react";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useRouteMatch } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { useDocumentContext } from "~/scenes/Document/components/DocumentContext";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Scrollable from "~/components/Scrollable";
import useEventListener from "~/hooks/useEventListener";
import useKeyDown from "~/hooks/useKeyDown";
import useStores from "~/hooks/useStores";
import { documentUrl } from "~/utils/routeHelpers";
import Time from "./Time";

function DocumentInsights() {
  const { documents } = useStores();
  const { t } = useTranslation();
  const match = useRouteMatch<{ documentSlug: string }>();
  const history = useHistory();
  const theme = useTheme();
  const selectedText = useTextSelection();
  const document = documents.getByUrl(match.params.documentSlug);

  const { editor } = useDocumentContext();
  const text = editor?.getPlainText();

  const onCloseInsights = () => {
    if (document) {
      history.push(documentUrl(document));
    } else {
      history.goBack();
    }
  };

  const stats = useTextStats(text ?? "", selectedText);

  useKeyDown("Escape", onCloseInsights);

  return (
    <Sidebar
      initial={{
        width: 0,
      }}
      animate={{
        transition: {
          type: "spring",
          bounce: 0.2,
          duration: 0.6,
        },
        width: theme.sidebarWidth,
      }}
      exit={{
        width: 0,
      }}
    >
      {document ? (
        <Position column>
          <Header>
            <Title>{t("Insights")}</Title>
            <Button
              icon={<CloseIcon />}
              onClick={onCloseInsights}
              borderOnHover
              neutral
            />
          </Header>
          <Scrollable topShadow>
            <Content column>
              <p>Words: {stats.total.words}</p>
              <p>Characters: {stats.total.characters}</p>
              <p>Emoji: {stats.total.emoji}</p>
              <p>
                Reading time:{" "}
                {stats.total.readingTime <= 1
                  ? "Under a minute"
                  : `${stats.total.readingTime} minutes`}
              </p>
              <p>Words: {stats.selected.words}</p>
              <p>Characters: {stats.selected.characters}</p>
            </Content>
            <Content column>
              <p>
                Created by {document.createdBy.name}{" "}
                <Time dateTime={document.createdAt} addSuffix />
              </p>
              <p>
                Last updated by {document.updatedBy.name}{" "}
                <Time dateTime={document.updatedAt} addSuffix />
              </p>
            </Content>
          </Scrollable>
        </Position>
      ) : null}
    </Sidebar>
  );
}

function useTextSelection() {
  const [selection, setSelection] = React.useState<string>("");

  const handleMouse = React.useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString();
    setSelection(text ?? "");
  }, []);

  useEventListener("mousemove", handleMouse);
  useEventListener("mouseup", handleMouse);

  return selection;
}

function useTextStats(text: string, selectedText: string) {
  const numTotalWords = countWords(text);
  const regex = emojiRegex();

  return {
    total: {
      words: numTotalWords,
      characters: text.length,
      emoji: regex.exec(text)?.length ?? 0,
      readingTime: Math.floor(numTotalWords / 200),
    },
    selected: {
      words: countWords(selectedText),
      characters: selectedText.length,
    },
  };
}

function countWords(text: string): number {
  return text ? text.trim().replace(/-/g, " ").split(/\s+/g).length : 0;
}

const Content = styled(Flex)`
  padding: 12px;
  user-select: none;
`;

const Position = styled(Flex)`
  position: fixed;
  top: 0;
  bottom: 0;
  width: ${(props) => props.theme.sidebarWidth}px;
`;

const Sidebar = styled(m.div)`
  display: none;
  position: relative;
  flex-shrink: 0;
  background: ${(props) => props.theme.background};
  width: ${(props) => props.theme.sidebarWidth}px;
  border-left: 1px solid ${(props) => props.theme.divider};
  z-index: 1;

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

const Title = styled(Flex)`
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  align-items: center;
  justify-content: flex-start;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  width: 0;
  flex-grow: 1;
`;

const Header = styled(Flex)`
  align-items: center;
  position: relative;
  padding: 16px 12px;
  color: ${(props) => props.theme.text};
  flex-shrink: 0;
`;

export default observer(DocumentInsights);
