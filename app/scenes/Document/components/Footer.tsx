import styled from "styled-components";
import type Document from "~/models/Document";
import KeyboardShortcutsButton from "./KeyboardShortcutsButton";
import ConnectionStatus from "./ConnectionStatus";
import { SizeWarning } from "./SizeWarning";

type Props = {
  document: Document;
};

export const Footer = ({ document }: Props) => (
  <FooterWrapper>
    <KeyboardShortcutsButton />
    <ConnectionStatus />
    <SizeWarning document={document} />
  </FooterWrapper>
);

const FooterWrapper = styled.div`
  position: fixed;
  bottom: 12px;
  right: 20px;
  text-align: right;
  display: flex;
  justify-content: flex-end;
  gap: 20px;
`;
