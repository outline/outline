import { BackIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { parseDomain } from "@shared/utils/domains";
import { Config } from "~/stores/AuthStore";
import env from "~/env";
import Desktop from "~/utils/Desktop";
import isCloudHosted from "~/utils/isCloudHosted";

type Props = {
  config?: Config;
  onBack?: () => void;
};

export function BackButton({ onBack, config }: Props) {
  const { t } = useTranslation();
  const isSubdomain = !!config?.hostname;

  if (onBack) {
    return (
      <Link onClick={onBack}>
        <BackIcon /> {t("Back")}
      </Link>
    );
  }

  if (!isCloudHosted || parseDomain(window.location.origin).custom) {
    return null;
  }

  if (Desktop.isElectron() && !isSubdomain) {
    return null;
  }

  return (
    <Link href={isSubdomain ? env.URL : "https://www.getoutline.com"}>
      <BackIcon /> {Desktop.isElectron() ? t("Back") : t("Back to home")}
    </Link>
  );
}

const Link = styled.a`
  display: flex;
  align-items: center;
  color: inherit;
  padding: ${Desktop.isElectron() ? "48px 32px" : "32px"};
  font-weight: 500;
  position: absolute;

  svg {
    transition: transform 100ms ease-in-out;
  }

  &:hover {
    svg {
      transform: translateX(-4px);
    }
  }
`;
