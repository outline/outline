import { HashtagIcon, SearchIcon, StarredIcon, UnstarredIcon } from "outline-icons";
import Tag from "~/models/Tag";
import { createAction, createActionWithChildren, createInternalLinkAction } from "~/actions";
import { NavigationSection } from "~/actions/sections";
import { searchPath, tagPath } from "~/utils/routeHelpers";

export const TagSection = ({ t }: { t: (key: string) => string }) => t("Tags");

export const openTag = createActionWithChildren({
  name: ({ t }) => t("Open tag"),
  analyticsName: "Open tag",
  section: NavigationSection,
  shortcut: ["o", "t"],
  icon: <HashtagIcon />,
  children: ({ stores }) => {
    const allTags = stores.tags.orderedData;
    return allTags.map((tag: Tag) =>
      createInternalLinkAction({
        id: `tag-${tag.id}`,
        name: tag.name,
        icon: <HashtagIcon />,
        section: NavigationSection,
        to: tagPath(tag.name),
      })
    );
  },
});

export const searchInTag = createActionWithChildren({
  name: ({ t }) => t("Search in tag"),
  analyticsName: "Search in tag",
  section: NavigationSection,
  icon: <SearchIcon />,
  children: ({ stores }) => {
    const allTags = stores.tags.orderedData;
    return allTags.map((tag: Tag) =>
      createInternalLinkAction({
        id: `search-tag-${tag.id}`,
        name: tag.name,
        icon: <HashtagIcon />,
        section: NavigationSection,
        to: searchPath({ tagId: tag.id }),
      })
    );
  },
});

export const starTag = createAction({
  name: ({ t, stores }) => {
    const pathname = window.location.pathname;
    const tagNameMatch = pathname.match(/^\/tags\/([^/]+)/);
    if (!tagNameMatch) {
      return t("Star tag");
    }
    const tagName = decodeURIComponent(tagNameMatch[1]);
    const tag = stores.tags.orderedData.find((t: Tag) => t.name === tagName);
    return tag?.isStarred ? t("Unstar tag") : t("Star tag");
  },
  analyticsName: "Star tag",
  section: ({ t }: { t: (key: string) => string }) => t("Tags"),
  icon: ({ stores }) => {
    const pathname = window.location.pathname;
    const tagNameMatch = pathname.match(/^\/tags\/([^/]+)/);
    if (!tagNameMatch) {
      return <StarredIcon />;
    }
    const tagName = decodeURIComponent(tagNameMatch[1]);
    const tag = stores.tags.orderedData.find((t: Tag) => t.name === tagName);
    return tag?.isStarred ? <UnstarredIcon /> : <StarredIcon />;
  },
  visible: () => {
    const pathname = window.location.pathname;
    return /^\/tags\/[^/]+/.test(pathname);
  },
  perform: async ({ stores }) => {
    const pathname = window.location.pathname;
    const tagNameMatch = pathname.match(/^\/tags\/([^/]+)/);
    if (!tagNameMatch) {
      return;
    }
    const tagName = decodeURIComponent(tagNameMatch[1]);
    const tag = stores.tags.orderedData.find((t: Tag) => t.name === tagName);
    if (!tag) {
      return;
    }
    if (tag.isStarred) {
      await stores.tags.unstar(tag);
    } else {
      await stores.tags.star(tag);
    }
  },
});

export const rootTagActions = [openTag, searchInTag, starTag];
