import { observer } from "mobx-react";
import { v4 as uuidv4 } from "uuid";
import { EmailIcon, LinkIcon } from "outline-icons";
import React, { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { EmbedDescriptor } from "@shared/editor/embeds";
import { MenuItem } from "@shared/editor/types";
import { MentionType } from "@shared/types";
import { isUrl } from "@shared/utils/urls";
import Integration from "~/models/Integration";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { determineMentionType, isURLMentionable } from "~/utils/mention";
import SuggestionsMenu, {
  Props as SuggestionsMenuProps,
} from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

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

  const embed = React.useMemo(() => {
    if (typeof pastedText === "string") {
      for (const e of embeds) {
        const matches = e.matcher(pastedText);
        if (matches) {
          return e;
        }
      }
    }
    return;
  }, [embeds, pastedText]);

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
        icon: embed?.icon,
        keywords: embed?.keywords,
      },
    ];
  }
  const linksToMentionType: Record<string, MentionType> = {};

  // list is pasted.
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
      : undefined;

    if (mentionType) {
      linksToMentionType[text] = mentionType;
    }

    return !!mentionType;
  });

  // don't render the menu when it can't be converted to mention.
  if (!convertibleToMentionList) {
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
      icon: <EmailIcon />,
      attrs: { actorId: user?.id, ...linksToMentionType },
    },
  ];
}
