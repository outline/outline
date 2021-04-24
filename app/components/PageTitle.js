// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { Helmet } from "react-helmet";
import useStores from "hooks/useStores";
import { cdnPath } from "utils/urls";

type Props = {|
  title: string,
  favicon?: string,
|};

const PageTitle = ({ title, favicon }: Props) => {
  const { auth } = useStores();
  const { team } = auth;

  return (
    <Helmet>
      <title>
        {team && team.name ? `${title} - ${team.name}` : `${title} - Outline`}
      </title>
      {favicon ? (
        <link rel="shortcut icon" href={favicon} />
      ) : (
        <link
          rel="shortcut icon"
          type="image/png"
          href={cdnPath("/favicon-32.png")}
          sizes="32x32"
        />
      )}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </Helmet>
  );
};

export default observer(PageTitle);
