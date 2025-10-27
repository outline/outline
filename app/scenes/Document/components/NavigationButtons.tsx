import { s } from "@shared/styles";
import React, { useMemo } from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { css } from "styled-components";
import Button from "~/components/Button";
import useStores from "~/hooks/useStores";
import Document from "~/models/Document";

const NavigationButtons = () => {
  const { collections, documents } = useStores();
  const activeCollection = collections.active;
  const activeDocument = documents.active;
  const history = useHistory();

  const docs = useMemo(() => {
    let navDocs: Record<string, Document | null> = {
      prevDoc: null,
      nextDoc: null,
    };

    const currentIndex = collections.flatDocuments.findIndex(
      (doc) => doc.id === activeDocument?.id
    );

    if (
      currentIndex !== undefined &&
      currentIndex !== -1 &&
      activeCollection?.documents
    ) {
      const nextIdx = currentIndex + 1;
      if (nextIdx < collections.flatDocuments.length) {
        navDocs.nextDoc = collections.flatDocuments[nextIdx];
      }

      const prevIdx = currentIndex - 1;
      if (prevIdx > -1) {
        navDocs.prevDoc = collections.flatDocuments[prevIdx];
      }
    }

    return navDocs;
  }, [activeDocument]);

  const handleNavigate = (doc: Document | null) => {
    if (doc) {
      history.push(doc.url);
    }
  };

  if (!docs.prevDoc && !docs.nextDoc) {
    return null;
  }

  return (
    <Wrapper>
      <NavButton
        isDisabled={!docs.prevDoc}
        onClick={() => handleNavigate(docs.prevDoc)}
      >
        {docs.prevDoc?.title
          ? `Previous Document: ${docs.prevDoc?.title}`
          : "..."}
      </NavButton>
      <NavButton
        isDisabled={!docs.nextDoc}
        onClick={() => handleNavigate(docs.nextDoc)}
      >
        {docs.nextDoc?.title ? `Next Document: ${docs.nextDoc?.title}` : "..."}
      </NavButton>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  position: fixed;
  bottom: 12px;
  margin-left: 20px;
  display: flex;
  gap: 20px;
`;

const NavButton = styled(Button)`
  min-width: 100px;
  opacity: 0.75;
  color: ${s("text")};

  &:hover {
    opacity: 1;
  }

  ${(props) =>
    props.isDisabled &&
    css`
      background-color: ${s("textTertiary")};
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    `}
`;

export default NavigationButtons;
