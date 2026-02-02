import * as React from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import { Bitrix24Utils } from "../../shared/Bitrix24Utils";
import Bitrix24Icon from "../Icon";

type Props = {
  scopes?: string[];
  redirectUri: string;
  icon?: React.ReactNode;
  state?: string;
  label?: string;
  domain?: string;
};

function Bitrix24Button({ state = "", scopes = ["tasks"], redirectUri, label, icon, domain }: Props) {
  const { t } = useTranslation();

  const handleClick = () => {
    window.location.href = Bitrix24Utils.authUrl(state, domain, scopes);
  };

  return (
    <Button onClick={handleClick} icon={icon || <Bitrix24Icon />} neutral>
      {label || t("Connect")}
    </Button>
  );
}

export default Bitrix24Button;
