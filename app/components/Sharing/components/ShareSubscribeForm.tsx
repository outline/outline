import type { FormEvent, ChangeEvent } from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import { client } from "~/utils/ApiClient";

/**
 * Subscribe form content displayed inside the popover.
 */
export function ShareSubscribeForm({
  shareId,
  documentId,
}: {
  shareId: string;
  documentId?: string;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      setStatus("loading");
      try {
        await client.post("/shares.subscribe", { shareId, documentId, email });
        setStatus("success");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : t("Something went wrong")
        );
        setStatus("error");
      }
    },
    [shareId, documentId, email]
  );

  const handleChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      setEmail(ev.target.value);
      if (status === "error") {
        setErrorMessage("");
        setStatus("idle");
      }
    },
    [status]
  );

  if (status === "success") {
    return (
      <FormContainer>
        <Text type="tertiary" size="small">
          {t("Check your email to confirm your subscription")}.
        </Text>
      </FormContainer>
    );
  }

  return (
    <FormContainer>
      <StyledForm onSubmit={handleSubmit}>
        <Text as="label" type="tertiary" size="small">
          {t("Get notified when this document is updated")}
        </Text>
        <Flex align="center" gap={8}>
          <Input
            type="email"
            value={email}
            onChange={handleChange}
            placeholder={t("Email address")}
            required
            margin={0}
            flex
          />
          <Button type="submit" disabled={status === "loading"} neutral>
            {t("Subscribe")}
          </Button>
        </Flex>
        {status === "error" && <ErrorText>{errorMessage}</ErrorText>}
      </StyledForm>
    </FormContainer>
  );
}

const FormContainer = styled.div`
  padding: 4px 0;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ErrorText = styled.p`
  font-size: 13px;
  color: ${s("danger")};
  margin: 0;
`;
