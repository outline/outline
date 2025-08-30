import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import ButtonLarge from "~/components/ButtonLarge";
import ChangeLanguage from "~/components/ChangeLanguage";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import Text from "~/components/Text";
import { detectLanguage } from "~/utils/language";
import { BackButton } from "./BackButton";
import { Background } from "./Background";
import { Centered } from "./Centered";
import { Form } from "~/components/primitives/Form";

const WorkspaceSetup = ({ onBack }: { onBack?: () => void }) => {
  const { t } = useTranslation();

  return (
    <Background>
      <BackButton onBack={onBack} />
      <ChangeLanguage locale={detectLanguage()} />
      <Centered
        as={Form}
        action="/api/installation.create"
        method="POST"
        gap={12}
      >
        <StyledHeading centered>{t("Create workspace")}</StyledHeading>
        <Content>
          {t(
            "Setup your workspace by providing a name and details for admin login. You can change these later."
          )}
        </Content>
        <Flex column gap={12} style={{ width: "100%" }}>
          <Input
            name="teamName"
            type="text"
            label={t("Workspace name")}
            placeholder="Acme, Inc"
            required
            autoFocus
            flex
          />
          <Input
            name="userName"
            type="text"
            label={t("Admin name")}
            required
            flex
          />
          <Input
            name="userEmail"
            type="email"
            label={t("Admin email")}
            required
            flex
          />
        </Flex>
        <ButtonLarge type="submit" fullwidth>
          {t("Continue")} →
        </ButtonLarge>
      </Centered>
    </Background>
  );
};

const StyledHeading = styled(Heading)`
  margin: 0;
`;

const Content = styled(Text)`
  color: ${s("textSecondary")};
  text-align: center;
  margin-top: -8px;
`;

export default WorkspaceSetup;
