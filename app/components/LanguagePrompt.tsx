import { m } from "framer-motion";
import find from "lodash/find";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { languages, languageOptions } from "@shared/i18n";
import ButtonLink from "~/components/ButtonLink";
import Flex from "~/components/Flex";
import env from "~/env";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { detectLanguage } from "~/utils/language";
import { LanguageIcon } from "./Icons/LanguageIcon";
import Text from "./Text";

export default function LanguagePrompt() {
  const { ui } = useStores();
  const { t } = useTranslation();
  const user = useCurrentUser();
  const language = detectLanguage();

  if (
    language === "en_US" ||
    language === user.language ||
    !languages.includes(language)
  ) {
    return null;
  }

  const option = find(languageOptions, (o) => o.value === language);
  const optionLabel = option ? option.label : "";
  const appName = env.APP_NAME;

  return (
    <Wrapper
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Flex align="center" gap={12}>
        <LanguageIcon />
        <span>
          <Text>
            {appName} is available in your language – {optionLabel}, would you
            like to change?
          </Text>
          <br />
          <Link
            onClick={async () => {
              ui.set({ languagePromptDismissed: true });
              await user.save({ language });
            }}
          >
            {t("Change Language")}
          </Link>{" "}
          &middot;{" "}
          <Link onClick={() => ui.set({ languagePromptDismissed: true })}>
            {t("Dismiss")}
          </Link>
        </span>
      </Flex>
    </Wrapper>
  );
}

const Wrapper = styled(m.p)`
  color: ${(props) => props.theme.text};
  border: 1px solid ${(props) => props.theme.divider};
  padding: 20px;
  margin-top: 12px;
  border-radius: 8px;
  position: relative;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);

  a {
    color: ${(props) => props.theme.text};
    font-weight: 500;
  }

  a:hover {
    text-decoration: underline;
  }
`;

const Link = styled(ButtonLink)`
  cursor: var(--cursor-pointer);
  color: ${(props) => props.theme.text};
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;
