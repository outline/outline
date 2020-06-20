// @flow
import * as React from "react";
import Button from "components/Button";
import ListItem from "components/List/Item";
import ApiKey from "models/ApiKey";

type Props = {
  token: ApiKey,
  onDelete: (tokenId: string) => void,
};

const TokenListItem = ({ token, onDelete }: Props) => {
  return (
    <ListItem
      key={token.id}
      title={token.name}
      subtitle={<code>{token.secret}</code>}
      actions={
        <Button onClick={() => onDelete(token.id)} neutral>
          Revoke
        </Button>
      }
    />
  );
};

export default TokenListItem;
