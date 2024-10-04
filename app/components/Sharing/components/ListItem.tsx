import { PlusIcon } from "outline-icons";
import styled from "styled-components";
import BaseListItem from "~/components/List/Item";
import { hover } from "~/styles";

export const InviteIcon = styled(PlusIcon)`
  opacity: 0;
`;

export const ListItem = styled(BaseListItem).attrs({
  small: true,
  border: false,
})`
  margin: 0 -16px;
  padding: 6px 16px;
  border-radius: 8px;

  &: ${hover} ${InviteIcon},
  &:focus ${InviteIcon},
  &:focus-within ${InviteIcon} {
    opacity: 1;
  }
`;
