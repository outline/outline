import type { TFunction } from "i18next";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { NavigationNode } from "@shared/types";
import { errToString } from "@shared/utils/error";
import { isUrl, sanitizeUrl } from "@shared/utils/urls";
import { NavigationLinkValidation } from "@shared/validations";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import useStores from "~/hooks/useStores";
import type Collection from "~/models/Collection";
import type RootStore from "~/stores/RootStore";
import { toCanonicalUrl } from "./internalLinks";

/** The values that can be edited in the link dialog. */
export interface LinkDialogValues {
  /** Title of the link. */
  title: string;
  /** External url that the link points to. */
  url: string;
}

/** Options to open the dialog that adds a link. */
export interface AddLinkDialogOptions {
  /** The root store. */
  stores: RootStore;
  /** The translation function. */
  t: TFunction;
  /** The collection to add the link to. */
  collection: Collection;
  /** The id of the document to add the link below, if any. */
  parentDocumentId?: string;
  /** The position among the siblings, defaults to the end. */
  index?: number;
  /** Called after the link is added. */
  onCreated?: () => void;
}

/** Options to open the dialog that edits a link. */
export interface EditLinkDialogOptions {
  /** The root store. */
  stores: RootStore;
  /** The translation function. */
  t: TFunction;
  /** The collection that contains the link. */
  collection: Collection;
  /** The link to edit. */
  node: NavigationNode;
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
  const { unfurls } = useStores();
  const [url, setUrl] = React.useState(defaultValues?.url ?? "");
  const [title, setTitle] = React.useState(defaultValues?.title ?? "");
  const [isSaving, setIsSaving] = React.useState(false);
  const latestUrl = React.useRef(url);
  const isTitleEdited = React.useRef(!!defaultValues?.title);

  const normalizedUrl = sanitizeUrl(url) ?? "";
  const isValidUrl = isUrl(normalizedUrl);
  const hostname = isValidUrl ? new URL(normalizedUrl).hostname : undefined;

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
    const unfurl = await unfurls.fetchUnfurl({ url: normalizedUrl });
    if (
      !unfurl ||
      !("title" in unfurl.data) ||
      typeof unfurl.data.title !== "string" ||
      isTitleEdited.current ||
      latestUrl.current !== requestedUrl
    ) {
      return;
    }

    setTitle(
      unfurl.data.title.trim().slice(0, NavigationLinkValidation.maxTitleLength)
    );
  }, [unfurls, normalizedUrl, hostname]);

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

/**
 * Opens a dialog that adds a sidebar link at the given position.
 *
 * @param options The collection and position of the new link.
 */
export function openAddLinkDialog({
  stores,
  t,
  collection,
  parentDocumentId,
  index,
  onCreated,
}: AddLinkDialogOptions) {
  const handleSubmit = async (values: LinkDialogValues) => {
    await collection.addLink(
      { ...values, url: await toCanonicalUrl(values.url, stores) },
      parentDocumentId,
      index
    );
    onCreated?.();
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
  collection,
  node,
}: EditLinkDialogOptions) {
  const handleSubmit = async (values: LinkDialogValues) => {
    await collection.updateLink(node.id, {
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

/**
 * Returns the url of a link when the text is a url, so that text pasted or
 * typed into an input can be added as a link instead.
 *
 * @param text The text to check.
 * @returns the normalized url, or undefined if the text is not a url.
 */
export function toLinkUrl(text: string): string | undefined {
  const trimmed = text.trim();
  if (
    !trimmed ||
    /\s/.test(trimmed) ||
    !isUrl(trimmed, { requireProtocol: false })
  ) {
    return undefined;
  }

  const url = sanitizeUrl(trimmed);
  return url && isUrl(url) ? url : undefined;
}

/**
 * Adds a sidebar link for a url, with the title of the page when it can be
 * unfurled and the hostname otherwise.
 *
 * @param options The collection, position and url of the new link.
 * @returns a promise that resolves to the new link node.
 */
export async function addLinkFromUrl({
  stores,
  collection,
  parentDocumentId,
  index,
  url,
}: Omit<AddLinkDialogOptions, "t" | "onCreated"> & { url: string }) {
  const [canonicalUrl, unfurl] = await Promise.all([
    toCanonicalUrl(url, stores),
    stores.unfurls.fetchUnfurl({ url }).catch(() => undefined),
  ]);
  const unfurledTitle =
    unfurl && "title" in unfurl.data && typeof unfurl.data.title === "string"
      ? unfurl.data.title.trim()
      : "";

  return collection.addLink(
    {
      url: canonicalUrl,
      title: (unfurledTitle || new URL(canonicalUrl).hostname).slice(
        0,
        NavigationLinkValidation.maxTitleLength
      ),
    },
    parentDocumentId,
    index
  );
}
