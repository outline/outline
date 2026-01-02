import { observer } from "mobx-react";
import { v4 as uuidv4 } from "uuid";
import { BrowserIcon, EmailIcon, LinkIcon } from "outline-icons";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { EmbedDescriptor } from "@shared/editor/embeds";
import type { MenuItem } from "@shared/editor/types";
import { MentionType } from "@shared/types";
import { isUrl } from "@shared/utils/urls";
import type Integration from "~/models/Integration";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { determineMentionType, isURLMentionable } from "~/utils/mention";
import type { Props as SuggestionsMenuProps } from "./SuggestionsMenu";
import SuggestionsMenu from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";
import { getMatchingEmbed } from "@shared/editor/lib/embeds";

type Props = Omit<
  SuggestionsMenuProps,
  "renderMenuItem" | "items" | "embeds" | "trigger"
> & {
  pastedText: string | string[];
  embeds: EmbedDescriptor[];
};

export const PasteMenu = observer(({ pastedText, embeds, ...props }: Props) => {
  const items = useItems({ pastedText, embeds });

  const renderMenuItem = useCallback(
    (item, _index, options) => (
      <SuggestionsMenuItem {...options} title={item.title} icon={item.icon} />
    ),
    []
  );

  if (!items) {
    props.onClose();
    return null;
  }

  return (
    <SuggestionsMenu
      {...props}
      trigger=""
      filterable={false}
      renderMenuItem={renderMenuItem}
      items={items}
    />
  );
});

function useItems({
  pastedText,
  embeds,
}: Pick<Props, "pastedText" | "embeds">): MenuItem[] | undefined {
  const { t } = useTranslation();
  const { integrations } = useStores();
  const user = useCurrentUser({ rejectOnEmpty: false });

  // single item is pasted.
  if (typeof pastedText === "string") {
    let mentionType: MentionType | undefined;

    if (pastedText && isUrl(pastedText)) {
      const url = new URL(pastedText);
      const integration = integrations.find((intg: Integration) =>
        isURLMentionable({ url, integration: intg })
      );

      mentionType = integration
        ? determineMentionType({ url, integration })
        : MentionType.URL;
    }

    const embed = getMatchingEmbed(embeds, pastedText)?.embed;

    return [
      {
        name: "noop",
        title: t("Keep as link"),
        icon: <LinkIcon />,
      },
      {
        name: "mention",
        title: t("Mention"),
        icon: <EmailIcon />,
        visible: !!mentionType,
        attrs: {
          id: uuidv4(),
          type: mentionType,
          label: pastedText,
          href: pastedText,
          modelId: uuidv4(),
          actorId: user?.id,
        },
        appendSpace: true,
      },
      {
        name: "embed",
        title: t("Embed"),
        visible: !!embed,
        icon: embed?.icon,
        keywords: embed?.keywords,
      },
    ];
  }

  // list is pasted.

  // Check if the links can be converted to mentions.
  const linksToMentionType: Record<string, MentionType> = {};
  const convertibleToMentionList = pastedText.every((text) => {
    if (!isUrl(text)) {
      return false;
    }

    const url = new URL(text);
    const integration = integrations.find((intg: Integration) =>
      isURLMentionable({ url, integration: intg })
    );

    const mentionType = integration
      ? determineMentionType({ url, integration })
      : MentionType.URL;

    if (mentionType) {
      linksToMentionType[text] = mentionType;
    }

    return !!mentionType;
  });

  // Check if the links can be converted to embeds.
  let embedType: string | undefined = undefined;

  const convertibleToEmbedList = pastedText.every((text) => {
    const embed = getMatchingEmbed(embeds, text)?.embed;

    if (!embed) {
      return false;
    }

    embedType = !embedType || embedType === embed.title ? embed.title : "mixed";
    return true;
  });

  const embedIcon =
    embedType === "mixed" ? (
      <BrowserIcon />
    ) : (
      embeds.find((e) => e.title === embedType)?.icon
    );

  // don't render the menu when it can't be converted to other types.
  if (!convertibleToMentionList && !convertibleToEmbedList) {
    return;
  }

  return [
    {
      name: "noop",
      title: t("Keep as link"),
      icon: <LinkIcon />,
    },
    {
      name: "mention_list",
      title: t("Mention"),
      visible: !!convertibleToMentionList,
      icon: <EmailIcon />,
      attrs: { actorId: user?.id, ...linksToMentionType },
    },
    {
      name: "embed_list",
      title: t("Embed"),
      visible: !!convertibleToEmbedList,
      icon: embedIcon,
      attrs: { actorId: user?.id },
    },
  ];
}
