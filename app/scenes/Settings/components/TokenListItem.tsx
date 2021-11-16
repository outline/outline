import * as React from "react";
import ApiKey from "models/ApiKey";
import Button from "components/Button";
import ListItem from "components/List/Item";

type Props = {
  token: ApiKey;
  onDelete: (tokenId: string) => Promise<void>;
};

const TokenListItem = ({ token, onDelete }: Props) => {
  return (
    <ListItem
      key={token.id}
      // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'string'.
      title={
        <>
          {token.name} – <code>{token.secret}</code>
        </>
      }
      actions={
        // @ts-expect-error ts-migrate(2747) FIXME: 'Button' components don't accept text as child ele... Remove this comment to see the full error message
        <Button onClick={() => onDelete(token.id)} neutral>
          Revoke
        </Button>
      }
    />
  );
};

export default TokenListItem;
