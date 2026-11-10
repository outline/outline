import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import { isUrl, sanitizeUrl } from "@shared/utils/urls";
import { NavigationLinkValidation } from "@shared/validations";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";

/** The values that can be edited in the link dialog. */
export interface LinkDialogValues {
  /** Title of the link. */
  title: string;
  /** External url that the link points to. */
  url: string;
}

interface Props {
  /** Values to start with, when editing an existing link. */
  defaultValues?: LinkDialogValues;
  /** Called with the values when the form is submitted. */
  onSubmit: (values: LinkDialogValues) => Promise<void>;
}

/**
 * A form to create or edit a sidebar link to an external location.
 */
export function LinkDialog({ defaultValues, onSubmit }: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = React.useState(defaultValues?.url ?? "");
  const [title, setTitle] = React.useState(defaultValues?.title ?? "");
  const [isSaving, setIsSaving] = React.useState(false);

  const normalizedUrl = sanitizeUrl(url) ?? "";
  const isValidUrl = isUrl(normalizedUrl);
  const hostname = isValidUrl ? new URL(normalizedUrl).hostname : undefined;

  const handleUrlChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setUrl(ev.target.value);
    },
    []
  );

  const handleTitleChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      setTitle(ev.target.value);
    },
    []
  );

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      if (!hostname) {
        return;
      }

      setIsSaving(true);
      try {
        await onSubmit({
          url: normalizedUrl,
          title: title.trim() || hostname,
        });
      } catch (err) {
        toast.error(errToString(err));
        setIsSaving(false);
      }
    },
    [onSubmit, normalizedUrl, hostname, title]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Flex column>
        <Input
          type="text"
          inputMode="url"
          label={t("URL")}
          placeholder="https://"
          onChange={handleUrlChange}
          value={url}
          maxLength={NavigationLinkValidation.maxUrlLength}
          required
          autoSelect
          flex
        />
        <Input
          type="text"
          label={t("Title")}
          placeholder={hostname}
          onChange={handleTitleChange}
          value={title}
          maxLength={NavigationLinkValidation.maxTitleLength}
          flex
        />
      </Flex>
      <Flex justify="flex-end">
        <Button type="submit" disabled={isSaving || !hostname}>
          {isSaving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </Flex>
    </form>
  );
}
