import { observer } from "mobx-react";
import { CopyIcon } from "outline-icons";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { errToString } from "@shared/utils/error";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import type AuthenticationProvider from "~/models/AuthenticationProvider";
import type { AuthenticationProviderConfigInput } from "~/stores/AuthenticationProvidersStore";
import { CopyButton } from "./CopyButton";

type FormData = Required<
  Omit<AuthenticationProviderConfigInput, "clientSecret">
> & {
  clientSecret: string;
};

type Props = {
  /** The URL that the identity provider redirects back to. */
  callbackUrl?: string;
  /** The provider to edit, if any. */
  provider?: AuthenticationProvider;
  /** Called with the configuration when the form is submitted. */
  onSubmit: (config: AuthenticationProviderConfigInput) => Promise<void>;
  /** Called when the provider should be removed, only when editing. */
  onRemove?: () => void;
};

/**
 * A form to configure an OpenID Connect authentication provider.
 */
export const OIDCProviderForm = observer(function OIDCProviderForm({
  callbackUrl,
  provider,
  onSubmit,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const config = provider?.config;
  const [useDiscovery, setUseDiscovery] = useState(
    () => !config || !!config.issuerUrl
  );

  const { register, handleSubmit, formState } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      displayName: config?.displayName ?? "",
      issuerUrl: config?.issuerUrl ?? "",
      authorizationUrl: config?.authorizationUrl ?? "",
      tokenUrl: config?.tokenUrl ?? "",
      userInfoUrl: config?.userInfoUrl ?? "",
      logoutUrl: config?.logoutUrl ?? "",
      clientId: config?.clientId ?? "",
      clientSecret: "",
      scopes: config?.scopes ?? "openid profile email",
      usernameClaim: config?.usernameClaim ?? "preferred_username",
    },
  });

  const handleFormSubmit = useCallback(
    async (data: FormData) => {
      const optional = (value: string) => value.trim() || undefined;

      try {
        await onSubmit({
          displayName: data.displayName.trim(),
          clientId: data.clientId.trim(),
          clientSecret: optional(data.clientSecret),
          scopes: optional(data.scopes),
          usernameClaim: optional(data.usernameClaim),
          ...(useDiscovery
            ? { issuerUrl: optional(data.issuerUrl) }
            : {
                authorizationUrl: optional(data.authorizationUrl),
                tokenUrl: optional(data.tokenUrl),
                userInfoUrl: optional(data.userInfoUrl),
                logoutUrl: optional(data.logoutUrl),
              }),
        });
      } catch (err) {
        toast.error(errToString(err));
      }
    },
    [onSubmit, useDiscovery]
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      {callbackUrl && (
        <>
          <Input
            type="text"
            label={t("Redirect URI")}
            value={callbackUrl}
            readOnly
            flex
          >
            <CopyButton
              value={callbackUrl}
              success={t("Copied to clipboard")}
              tooltip={t("Copy")}
              icon={<CopyIcon size={20} />}
            />
          </Input>
          <Note type="secondary" size="small">
            {t(
              "Register this redirect URI with your identity provider when creating the client."
            )}
          </Note>
        </>
      )}
      <Input
        type="text"
        label={t("Name")}
        placeholder={t("e.g. Okta")}
        {...register("displayName", { required: true, maxLength: 50 })}
        autoComplete="off"
        autoFocus
        flex
      />
      <Switch
        label={t("Discover endpoints from issuer")}
        note={t(
          "Load endpoints from the provider's OpenID configuration document"
        )}
        checked={useDiscovery}
        onChange={setUseDiscovery}
      />
      {useDiscovery ? (
        <Input
          type="text"
          label={t("Issuer URL")}
          placeholder="https://auth.example.com"
          {...register("issuerUrl", { required: useDiscovery })}
          autoComplete="off"
          flex
        />
      ) : (
        <>
          <Input
            type="text"
            label={t("Authorization endpoint")}
            placeholder="https://auth.example.com/authorize"
            {...register("authorizationUrl", { required: !useDiscovery })}
            autoComplete="off"
            flex
          />
          <Input
            type="text"
            label={t("Token endpoint")}
            placeholder="https://auth.example.com/token"
            {...register("tokenUrl", { required: !useDiscovery })}
            autoComplete="off"
            flex
          />
          <Input
            type="text"
            label={t("Userinfo endpoint")}
            placeholder="https://auth.example.com/userinfo"
            {...register("userInfoUrl", { required: !useDiscovery })}
            autoComplete="off"
            flex
          />
          <Input
            type="text"
            label={t("Logout endpoint")}
            placeholder={t("Optional")}
            {...register("logoutUrl")}
            autoComplete="off"
            flex
          />
        </>
      )}
      <Input
        type="text"
        label={t("Client ID")}
        {...register("clientId", { required: true })}
        autoComplete="off"
        flex
      />
      <Input
        type="password"
        label={t("Client secret")}
        placeholder={
          provider ? t("Leave blank to keep the current secret") : ""
        }
        {...register("clientSecret", { required: !provider })}
        autoComplete="new-password"
        flex
      />
      <Input
        type="text"
        label={t("Scopes")}
        {...register("scopes")}
        autoComplete="off"
        flex
      />
      <Input
        type="text"
        label={t("Username claim")}
        {...register("usernameClaim")}
        autoComplete="off"
        flex
      />
      <Flex justify="space-between" gap={8}>
        {onRemove ? (
          <Button type="button" onClick={onRemove} neutral>
            {t("Remove")}
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          disabled={formState.isSubmitting || !formState.isValid}
        >
          {formState.isSubmitting
            ? `${t("Saving")}…`
            : provider
              ? t("Save")
              : t("Save and test")}
        </Button>
      </Flex>
    </form>
  );
});

const Note = styled(Text)`
  margin-top: -8px;
  margin-bottom: 16px;
`;
