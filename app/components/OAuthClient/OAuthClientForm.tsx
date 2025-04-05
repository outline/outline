import { observer } from "mobx-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { OAuthClientValidation } from "@shared/validations";
import OAuthClient from "~/models/OAuthClient";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import isCloudHosted from "~/utils/isCloudHosted";
import Switch from "../Switch";

export interface FormData {
  name: string;
  developerName: string;
  developerUrl: string;
  description: string;
  avatarUrl: string;
  redirectUris: string[];
  published: boolean;
}

export const OAuthClientForm = observer(function OAuthClientForm_({
  handleSubmit,
  oauthClient,
}: {
  handleSubmit: (data: FormData) => void;
  oauthClient?: OAuthClient;
}) {
  // const team = useCurrentTeam();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit: formHandleSubmit,
    formState,
    setFocus,
    control,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      name: oauthClient?.name ?? "",
      developerName: oauthClient?.developerName ?? "",
      developerUrl: oauthClient?.developerUrl ?? "",
      description: oauthClient?.description ?? "",
      avatarUrl: oauthClient?.avatarUrl ?? "",
      redirectUris: oauthClient?.redirectUris ?? [],
      published: oauthClient?.published ?? false,
    },
  });

  React.useEffect(() => {
    setTimeout(() => setFocus("name", { shouldSelect: true }), 100);
  }, [setFocus]);

  return (
    <form onSubmit={formHandleSubmit(handleSubmit)}>
      <>
        <Input
          type="text"
          label={t("Name")}
          placeholder={t("My App")}
          {...register("name", {
            required: true,
            maxLength: OAuthClientValidation.maxNameLength,
          })}
          autoComplete="off"
          autoFocus
          flex
        />
        <Input
          type="text"
          label={t("Developer name")}
          {...register("developerName", {
            maxLength: OAuthClientValidation.maxDeveloperNameLength,
          })}
          flex
        />
        <Input
          type="text"
          label={t("Developer URL")}
          {...register("developerUrl", {
            maxLength: OAuthClientValidation.maxDeveloperUrlLength,
          })}
          flex
        />
        <Controller
          control={control}
          name="redirectUris"
          render={({ field }) => (
            <Input
              type="textarea"
              label={t("Redirect URIs")}
              placeholder="https://example.com/callback"
              ref={field.ref}
              value={field.value.join("\n")}
              rows={Math.max(2, field.value.length)}
              onChange={(event) => {
                field.onChange(event.target.value.split("\n"));
              }}
            />
          )}
        />
        {isCloudHosted && (
          <Switch
            {...register("published")}
            label={t("Published")}
            note={t("Allow this app to be installed by other workspaces")}
          />
        )}
      </>

      <Flex justify="flex-end">
        <Button
          type="submit"
          disabled={formState.isSubmitting || !formState.isValid}
        >
          {oauthClient
            ? formState.isSubmitting
              ? `${t("Saving")}…`
              : t("Save")
            : formState.isSubmitting
            ? `${t("Creating")}…`
            : t("Create")}
        </Button>
      </Flex>
    </form>
  );
});
