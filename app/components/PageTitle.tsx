import { observer } from "mobx-react";
import * as React from "react";
import { Helmet } from "react-helmet-async";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { useTeamContext } from "./TeamContext";

type Props = {
  title: React.ReactNode;
  favicon?: string;
};

const originalShortcutHref = document
  .querySelector('link[rel="shortcut icon"]')
  ?.getAttribute("href") as string;

const PageTitle = ({ title, favicon }: Props) => {
  const { auth } = useStores();
  const team = useTeamContext() ?? auth.team;

  return (
    <Helmet>
      <title>
        {team?.name ? `${title} - ${team.name}` : `${title} - ${env.APP_NAME}`}
      </title>
      <link
        rel="shortcut icon"
        type="image/png"
        href={favicon ?? originalShortcutHref}
        key={favicon ?? originalShortcutHref}
      />
    </Helmet>
  );
};

export default observer(PageTitle);
