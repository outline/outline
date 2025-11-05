import { s } from "@shared/styles";
import React, { useMemo } from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { css } from "styled-components";
import { RealButton } from "~/components/Button";
import useStores from "~/hooks/useStores";
import Document from "~/models/Document";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const NavigationButtons = () => {
  const { collections, documents, ui } = useStores();
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
    <Wrapper
      fullwidth={!(docs.prevDoc && docs.nextDoc)}
      sidebarOpen={!ui.sidebarIsClosed}
    >
      {docs.prevDoc && (
        <NavButton
          $neutral
          $fullwidth={!docs.nextDoc}
          onClick={() => handleNavigate(docs.prevDoc)}
        >
          <ButtonContent>
            <FontAwesomeIcon icon={faChevronLeft} />
            <ButtonText style={{ alignItems: "flex-end" }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Previous</span>
              <span>{docs.prevDoc?.title}</span>
            </ButtonText>
          </ButtonContent>
        </NavButton>
      )}

      {docs.nextDoc && (
        <NavButton
          $neutral
          $fullwidth={!docs.prevDoc}
          onClick={() => handleNavigate(docs.nextDoc)}
        >
          <ButtonContent>
            <ButtonText style={{ alignItems: "flex-start" }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Next</span>
              <span>{docs.nextDoc?.title}</span>
            </ButtonText>
            <FontAwesomeIcon icon={faChevronRight} />
          </ButtonContent>
        </NavButton>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div<
  React.HTMLAttributes<HTMLDivElement> & {
    fullwidth?: boolean;
    sidebarOpen?: boolean;
  }
>`
  position: fixed;
  bottom: 12px;
  margin-left: 20px;
  display: flex;
  flex-direction: row;
  gap: 20px;
  left: 50%;
  transform: translateX(-50%);

  ${(props) => css`
    width: ${props.fullwidth ? "35%" : "45%"};
  `}

  ${(props) =>
    props.sidebarOpen &&
    css`
      @media (max-width: 1100px) {
        left: 55%;
      }

      @media (max-width: 900px) {
        left: 65%;
      }
    `}

  @media (max-width: 900px) {
    flex-direction: column;
    width: 60%;
    margin-left: 0;
    gap: 10px;
  }

  @media (max-width: 735px) {
    width: 90%;
    left: 50%;
  }
`;

const NavButton = styled(RealButton)`
  height: 60px;
  padding: 4px 12px;
  font-weight: bold;
  color: ${s("text")};
  border-radius: 2px;
  line-height: 18px;
  width: 60%;
  background: none;
  shadow: 0 0 0 0 black;

  &:hover {
    opacity: 1;
    background: none;
  }

  ${(props) => css`
    width: ${props.$fullwidth ? "100%" : "50%"};
  `}

  @media (max-width: 900px) {
    width: 100%;
  }
`;

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ButtonText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-content: center;
  justify-items: center;
  bacground-color: red;
  font-size: 16px;
  font-weight: bold;
`;

export default NavigationButtons;
