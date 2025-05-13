import { observer } from "mobx-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { OAuthClientValidation } from "@shared/validations";
import OAuthClient from "~/models/oauth/OAuthClient";
import ImageInput from "~/scenes/Settings/components/ImageInput";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input, { LabelText } from "~/components/Input";
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
  const { t } = useTranslation();

  const {
    register,
    handleSubmit: formHandleSubmit,
    formState,
    getValues,
    setFocus,
    setError,
    control,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      name: oauthClient?.name ?? "",
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
        <label style={{ marginBottom: "1em" }}>
          <LabelText>{t("Icon")}</LabelText>
          <Controller
            control={control}
            name="avatarUrl"
            render={({ field }) => (
              <ImageInput
                onSuccess={(url) => field.onChange(url)}
                onError={(err) => setError("avatarUrl", { message: err })}
                model={{
                  id: oauthClient?.id,
                  avatarUrl: field.value,
                  initial: getValues().name[0],
                }}
                borderRadius={0}
              />
            )}
          />
        </label>
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
          label={t("Tagline")}
          placeholder={t("A short description")}
          {...register("description", {
            maxLength: OAuthClientValidation.maxDescriptionLength,
          })}
          flex
        />
        <Controller
          control={control}
          name="redirectUris"
          render={({ field }) => (
            <Input
              type="textarea"
              label={t("Callback URLs")}
              placeholder="https://example.com/callback"
              ref={field.ref}
              value={field.value.join("\n")}
              rows={Math.max(2, field.value.length + 1)}
              onChange={(event) => {
                field.onChange(event.target.value.split("\n"));
              }}
              required
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
