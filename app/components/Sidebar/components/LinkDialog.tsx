import type { TFunction } from "i18next";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { NavigationNode } from "@shared/types";
import { errToString } from "@shared/utils/error";
import { getHostname, isUrl, sanitizeUrl } from "@shared/utils/urls";
import { NavigationLinkValidation } from "@shared/validations";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import useStores from "~/hooks/useStores";
import type RootStore from "~/stores/RootStore";
import { fetchLinkTitle, toCanonicalUrl } from "./linkUrls";

/**
 * Opens a dialog that adds a sidebar link at the given position.
 *
 * @param options The collection and position of the new link.
 */
export function openAddLinkDialog({
  stores,
  t,
  collectionId,
  parentDocumentId,
  index,
}: DialogOptions & { parentDocumentId?: string; index?: number }) {
  const handleSubmit = async (values: LinkValues) => {
    await stores.collections.addLink(
      collectionId,
      { ...values, url: await toCanonicalUrl(values.url, stores) },
      parentDocumentId,
      index
    );
    stores.dialogs.closeAllModals();
  };

  stores.dialogs.openModal({
    title: t("Add link"),
    content: <LinkDialog onSubmit={handleSubmit} />,
  });
}

/**
 * Opens a dialog that edits the title and url of a sidebar link.
 *
 * @param options The link to edit.
 */
export function openEditLinkDialog({
  stores,
  t,
  collectionId,
  node,
}: DialogOptions & { node: NavigationNode }) {
  const handleSubmit = async (values: LinkValues) => {
    await stores.collections.updateLink(collectionId, node.id, {
      ...values,
      url: await toCanonicalUrl(values.url, stores),
    });
    stores.dialogs.closeAllModals();
  };

  stores.dialogs.openModal({
    title: t("Edit link"),
    content: (
      <LinkDialog
        defaultValues={{ title: node.title, url: node.url }}
        onSubmit={handleSubmit}
      />
    ),
  });
}

/** Options shared by the dialogs that add and edit a link. */
interface DialogOptions {
  /** The root store. */
  stores: RootStore;
  /** The translation function. */
  t: TFunction;
  /** The id of the collection that contains the link. */
  collectionId: string;
}

/** The values that can be edited in the link dialog. */
interface LinkValues {
  /** Title of the link. */
  title: string;
  /** External url that the link points to. */
  url: string;
}

interface Props {
  /** Values to start with, when editing an existing link. */
  defaultValues?: LinkValues;
  /** Called with the values when the form is submitted. */
  onSubmit: (values: LinkValues) => Promise<void>;
}

/**
 * A form to create or edit a sidebar link.
 */
function LinkDialog({ defaultValues, onSubmit }: Props) {
  const { t } = useTranslation();
  const stores = useStores();
  const [url, setUrl] = React.useState(defaultValues?.url ?? "");
  const [title, setTitle] = React.useState(defaultValues?.title ?? "");
  const [isSaving, setIsSaving] = React.useState(false);
  const latestUrl = React.useRef(url);
  const isTitleEdited = React.useRef(!!defaultValues?.title);

  const normalizedUrl = sanitizeUrl(url) ?? "";
  const hostname = isUrl(normalizedUrl)
    ? getHostname(normalizedUrl)
    : undefined;

  const handleUrlChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      latestUrl.current = ev.target.value;
      setUrl(ev.target.value);
    },
    []
  );

  // Fill in the title from the page, unless the user has entered one.
  const handleUrlBlur = React.useCallback(async () => {
    if (!hostname || isTitleEdited.current) {
      return;
    }

    const requestedUrl = latestUrl.current;
    const fetchedTitle = await fetchLinkTitle(normalizedUrl, stores);
    if (
      fetchedTitle &&
      !isTitleEdited.current &&
      latestUrl.current === requestedUrl
    ) {
      setTitle(fetchedTitle);
    }
  }, [stores, normalizedUrl, hostname]);

  const handleTitleChange = React.useCallback(
    (ev: React.ChangeEvent<HTMLInputElement>) => {
      isTitleEdited.current = !!ev.target.value;
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
          onBlur={handleUrlBlur}
          value={url}
          maxLength={NavigationLinkValidation.maxUrlLength}
          required
          autoSelect
          flex
        />
        <Input
          type="text"
          label={t("Title")}
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
