import type { FormEvent, ChangeEvent } from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import { client } from "~/utils/ApiClient";

/**
 * Subscribe form content displayed inside the popover.
 */
export function ShareSubscribeForm({ shareId }: { shareId: string }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleSubmit = useCallback(
    async (ev: FormEvent) => {
      ev.preventDefault();
      setStatus("loading");
      try {
        await client.post("/shares.subscribe", { shareId, email });
        setStatus("success");
      } catch {
        setStatus("error");
      }
    },
    [shareId, email]
  );

  const handleChange = useCallback(
    (ev: ChangeEvent<HTMLInputElement>) => {
      setEmail(ev.target.value);
      if (status === "error") {
        setStatus("idle");
      }
    },
    [status]
  );

  if (status === "success") {
    return (
      <FormContainer>
        <SuccessText>
          {t("Check your email to confirm your subscription.")}
        </SuccessText>
      </FormContainer>
    );
  }

  return (
    <FormContainer>
      <StyledForm onSubmit={handleSubmit}>
        <Label>{t("Get notified when this document is updated")}</Label>
        <InputRow align="center" gap={8}>
          <EmailInput
            type="email"
            value={email}
            onChange={handleChange}
            placeholder={t("Email address")}
            required
          />
          <Button type="submit" disabled={status === "loading"} neutral>
            {t("Subscribe")}
          </Button>
        </InputRow>
        {status === "error" && (
          <ErrorText>{t("Something went wrong. Please try again.")}</ErrorText>
        )}
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

const Label = styled.label`
  font-size: 14px;
  color: ${s("textTertiary")};
`;

const InputRow = styled(Flex)``;

const EmailInput = styled.input`
  flex: 1;
  padding: 6px 12px;
  border: 1px solid ${s("inputBorder")};
  border-radius: 4px;
  background: ${s("background")};
  color: ${s("text")};
  font-size: 14px;
  outline: none;

  &:focus {
    border-color: ${s("accent")};
  }

  &::placeholder {
    color: ${s("placeholder")};
  }
`;

const SuccessText = styled.p`
  font-size: 14px;
  color: ${s("textTertiary")};
  margin: 0;
`;

const ErrorText = styled.p`
  font-size: 13px;
  color: ${s("danger")};
  margin: 0;
`;
