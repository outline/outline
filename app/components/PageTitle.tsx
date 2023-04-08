import { observer } from "mobx-react";
import * as React from "react";
import { Helmet } from "react-helmet-async";
import { cdnPath } from "@shared/utils/urls";
import env from "~/env";
import useStores from "~/hooks/useStores";

type Props = {
  title: React.ReactNode;
  favicon?: string;
};

const PageTitle = ({ title, favicon }: Props) => {
  const { auth } = useStores();
  const { team } = auth;

  return (
    <Helmet>
      <title>
        {team?.name ? `${title} - ${team.name}` : `${title} - ${env.APP_NAME}`}
      </title>
      {favicon ? (
        <link rel="shortcut icon" href={favicon} key={favicon} />
      ) : (
        <link
          rel="shortcut icon"
          type="image/png"
          key="favicon"
          href={cdnPath("/images/favicon-32.png")}
          sizes="32x32"
        />
      )}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </Helmet>
  );
};

export default observer(PageTitle);
