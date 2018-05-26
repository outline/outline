// @flow
import * as React from 'react';
import Button from 'components/Button';
import ListItem from 'components/List/Item';
import type { ApiKey } from '../../../types';

type Props = {
  token: ApiKey,
  onDelete: (tokenId: string) => *,
};

const TokenListItem = ({ token, onDelete }: Props) => {
  return (
    <ListItem
      key={token.id}
      title={token.name}
      subtitle={<code>{token.secret}</code>}
      actions={
        <Button onClick={() => onDelete(token.id)} light>
          Revoke
        </Button>
      }
    />
  );
};

export default TokenListItem;
