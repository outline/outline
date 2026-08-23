import styled from "styled-components";
import type Note from "~/models/Note";
import ConnectionStatus from "./ConnectionStatus";
import { SizeWarning } from "./SizeWarning";
type Props = {
  note: Note;
};
export const Footer = ({ note }: Props) => (
  <FooterWrapper>
    <ConnectionStatus />
    <SizeWarning note={note} />
  </FooterWrapper>
);
const FooterWrapper = styled.div`
  position: fixed;
  bottom: 12px;
  right: 12px;
  text-align: right;
  display: flex;
  justify-content: flex-end;
  gap: 20px;
`;
