import { debounce } from "es-toolkit/compat";
import { CheckmarkIcon } from "outline-icons";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Spinner from "@shared/components/Spinner";
import ButtonLarge from "~/components/ButtonLarge";
import Input from "~/components/Input";
import Text from "~/components/Text";
import { DefaultHostname, navigateToHost, validateHost } from "../urls";

type Status = "idle" | "checking" | "valid" | "invalid";

/**
 * Dialog that allows choosing the Outline installation to connect the desktop
 * app to. The entered host is validated against its auth configuration before
 * the user is able to continue.
 */
export function SwitchHostDialog() {
  const { t } = useTranslation();
  const [host, setHost] = useState(DefaultHostname);
  const [status, setStatus] = useState<Status>("idle");
  const [validatedUrl, setValidatedUrl] = useState<string | null>(null);

  // Tracks the latest value being checked so a slow check that resolves after
  // newer input is ignored.
  const latestValue = useRef("");

  const checkHost = useMemo(
    () =>
      debounce(async (value: string) => {
        try {
          const url = await validateHost(value);
          if (latestValue.current === value) {
            setValidatedUrl(url);
            setStatus("valid");
          }
        } catch {
          if (latestValue.current === value) {
            setValidatedUrl(null);
            setStatus("invalid");
          }
        }
      }, 500),
    []
  );

  useEffect(() => {
    const value = host.trim();
    latestValue.current = value;

    if (!value) {
      checkHost.cancel();
      setStatus("idle");
      setValidatedUrl(null);
      return;
    }

    setStatus("checking");
    void checkHost(value);

    return () => checkHost.cancel();
  }, [host, checkHost]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setHost(value);
      setValidatedUrl(null);
      setStatus(value.trim() ? "checking" : "idle");
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (status === "valid" && validatedUrl) {
        await navigateToHost(validatedUrl);
      }
    },
    [status, validatedUrl]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Text as="p">
        {t("Enter the address of an Outline workspace to connect")}
      </Text>
      <Input
        autoFocus
        value={host}
        onChange={handleChange}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        prefix={<Prefix>https://</Prefix>}
        error={
          status === "invalid"
            ? t("This doesn’t appear to be a valid installation")
            : undefined
        }
      >
        <Status>
          {status === "checking" ? (
            <Spinner />
          ) : status === "valid" ? (
            <ValidIcon />
          ) : null}
        </Status>
      </Input>
      <ButtonLarge
        type="submit"
        fullwidth
        disabled={status !== "valid"}
        style={{ marginTop: "1em" }}
      >
        {t("Continue")}
      </ButtonLarge>
    </form>
  );
}

const Prefix = styled.span`
  color: ${s("textTertiary")};
  padding-left: 8px;
`;

const Status = styled.span`
  display: flex;
  align-items: center;
  padding-right: 8px;
`;

const ValidIcon = styled(CheckmarkIcon)`
  color: ${s("accent")};
`;
