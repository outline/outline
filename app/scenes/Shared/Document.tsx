import { observer } from "mobx-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { PublicTeam } from "@shared/types";
import { TOCPosition } from "@shared/types";
import type DocumentModel from "~/models/Document";
import DocumentComponent from "~/scenes/Document/components/Document";
import Branding from "~/components/Branding";
import Button from "~/components/Button";
import { useDocumentContext } from "~/components/DocumentContext";
import Flex from "~/components/Flex";
import { useTeamContext } from "~/components/TeamContext";
import useCurrentUser from "~/hooks/useCurrentUser";
import useQuery from "~/hooks/useQuery";
import useShare from "@shared/hooks/useShare";
import { parseDomain } from "@shared/utils/domains";
import { client } from "~/utils/ApiClient";

type Props = {
  document: DocumentModel;
};

function SharedDocument({ document }: Props) {
  const { shareId } = useShare();
  const query = useQuery();
  const searchTerm = query.get("q") || undefined;
  const team = useTeamContext() as PublicTeam | undefined;
  const user = useCurrentUser({ rejectOnEmpty: false });
  const { hasHeadings, setDocument, isEditorInitialized, editor } =
    useDocumentContext();
  const abilities = useMemo(() => ({}), []);
  const isCustomDomain = useMemo(
    () => parseDomain(window.location.origin).custom,
    []
  );
  const showBranding = !isCustomDomain && !user;
  const searchTermProcessed = useRef<string | null>(null);

  const tocPosition = hasHeadings
    ? (team?.tocPosition ?? TOCPosition.Left)
    : false;
  setDocument(document);

  // Highlight search term when navigating from search results
  useEffect(() => {
    if (
      isEditorInitialized &&
      editor &&
      searchTerm &&
      searchTermProcessed.current !== searchTerm
    ) {
      searchTermProcessed.current = searchTerm;
      editor.commands.find({ text: searchTerm });
    }
  }, [isEditorInitialized, editor, searchTerm]);

  return (
    <>
      <DocumentComponent
        abilities={abilities}
        document={document}
        shareId={shareId}
        tocPosition={tocPosition}
        readOnly
      />
      {showBranding ? (
        <Branding href="//www.getoutline.com?ref=sharelink" />
      ) : null}
    </>
  );
}

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
    async (ev: React.FormEvent) => {
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
    (ev: React.ChangeEvent<HTMLInputElement>) => {
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

export const Document = observer(SharedDocument);
