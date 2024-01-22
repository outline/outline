import * as React from "react";
import { useTranslation } from "react-i18next";
import { githubAuth } from "@shared/utils/urlHelpers";
import Button from "~/components/Button";
import env from "~/env";

type Props = {
  redirectUri: string;
  state?: string;
  icon?: React.ReactNode;
  label?: string;
};

function GithubButton({ state = "", redirectUri, label, icon }: Props) {
  const { t } = useTranslation();

  const handleClick = () => {
    if (!env.GITHUB_CLIENT_ID) {
      return;
    }

    window.location.href = githubAuth(state, env.GITHUB_CLIENT_ID, redirectUri);
  };

  return (
    <Button onClick={handleClick} icon={icon} neutral>
      {label || t("Add to GitHub")}
    </Button>
  );
}

export default GithubButton;
