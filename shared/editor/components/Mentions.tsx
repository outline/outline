import { observer } from "mobx-react";
import {
  DocumentIcon,
  EmailIcon,
  CollectionIcon,
  WarningIcon,
} from "outline-icons";
import type { Node } from "prosemirror-model";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  dateToRelativeReadable,
  hasTimeComponent,
  parseISODate,
} from "../../utils/date";
import { Backticks } from "../../components/Backticks";
import Flex from "../../components/Flex";
import Icon from "../../components/Icon";
import { IssueStatusIcon } from "../../components/IssueStatusIcon";
import { PullRequestIcon } from "../../components/PullRequestIcon";
import Spinner from "../../components/Spinner";
import Text from "../../components/Text";
import useStores from "../../hooks/useStores";
import useShare from "../../hooks/useShare";
import env from "../../env";
import theme from "../../styles/theme";
import {
  MentionDisplay,
  UnfurlResourceType,
  type JSONValue,
  type UnfurlResponse,
} from "../../types";
import { cn } from "../styles/utils";
import type { ComponentProps } from "../types";
import lazyWithRetry from "../../utils/lazyWithRetry";
import { sharedModelPath } from "../../utils/routeHelpers";
import { toDisplayUrl, cdnPath, sanitizeImageSrc } from "../../utils/urls";
import Squircle from "../../components/Squircle";
import { LinkCard, MentionCard } from "./MentionCard";
import { ProsemirrorDataHelper } from "../../utils/ProsemirrorDataHelper";

type Attrs = {
  className: string;
  unfurl?: UnfurlResponse[keyof UnfurlResponse];
} & Record<string, JSONValue>;

/**
 * Returns mention attributes with the selection class applied.
 *
 * @param node the mention node.
 * @param isSelected whether the mention is selected.
 * @returns the attributes for the rendered mention.
 */
const getAttributesFromNode = (node: Node, isSelected = false): Attrs => {
  const spec = node.type.spec.toDOM?.(node) as unknown as Record<
    string,
    JSONValue
  >[];
  const { class: className, "data-unfurl": unfurl, ...attrs } = spec[1];

  return {
    className: cn(typeof className === "string" ? className : undefined, {
      "ProseMirror-selectednode": isSelected,
    }),
    unfurl: unfurl
      ? (JSON.parse(unfurl as string) as Attrs["unfurl"])
      : undefined,
    ...attrs,
  };
};

/**
 * Returns a hook that scopes an internal model path to the current public share,
 * if any, so that navigation stays within the share rather than falling through
 * to the authenticated app (and its login screen).
 */
const useSharePath = () => {
  const { shareId } = useShare();

  return React.useCallback(
    (path: string) =>
      shareId ? sharedModelPath(shareId, path, env.ROOT_SHARE_ID) : path,
    [shareId]
  );
};

export const MentionUser = observer(function MentionUser_(
  props: ComponentProps
) {
  const { isSelected, node } = props;
  const { users } = useStores();
  const user = users.get(node.attrs.modelId);
  const { className, unfurl, ...attrs } = getAttributesFromNode(
    node,
    isSelected
  );

  return (
    <span {...attrs} className={className}>
      <EmailIcon size={18} />
      <span>{user?.name || node.attrs.label}</span>
    </span>
  );
});

export const MentionGroup = observer(function MentionGroup_(
  props: ComponentProps
) {
  const { isSelected, node } = props;
  const { groups } = useStores();
  const group = groups.get(node.attrs.modelId);
  const { className, ...attrs } = getAttributesFromNode(node, isSelected);

  return (
    <span {...attrs} className={className}>
      <EmailIcon size={18} />
      <span>{group?.name || node.attrs.label}</span>
    </span>
  );
});

export const MentionDocument = observer(function MentionDocument_(
  props: ComponentProps
) {
  const { isSelected, node } = props;
  const { t } = useTranslation();
  const { documents, collections, unfurls } = useStores();
  const doc = documents.get(node.attrs.modelId);
  const modelId = node.attrs.modelId;
  const anchorId = node.attrs.anchorId;
  const isCard = node.attrs.display === MentionDisplay.Card;
  const { className, unfurl, ...attrs } = getAttributesFromNode(
    node,
    isSelected
  );
  const sharePath = useSharePath();
  const { shareId } = useShare();
  const hash = anchorId ? `#${anchorId}` : "";

  // The summary is specific to the viewer, so it is kept in the store and not
  // written to the node. The share id is always included, even for a root
  // share, so that the server can check access through the share.
  const unfurlUrl = isCard
    ? `${env.URL}${shareId ? `/s/${shareId}` : ""}/doc/${modelId}${hash}`
    : undefined;

  React.useEffect(() => {
    if (modelId) {
      void documents.prefetchDocument(modelId);
    }
  }, [modelId, documents]);

  React.useEffect(() => {
    if (unfurlUrl) {
      void unfurls.fetchUnfurl({ url: unfurlUrl });
    }
  }, [unfurlUrl, unfurls]);

  const documentPath = sharePath(doc?.path ?? `/doc/${node.attrs.modelId}`);
  const icon = doc?.icon ? (
    <Icon value={doc.icon} initial={doc.initial} color={doc.color} size={18} />
  ) : (
    <DocumentIcon size={18} />
  );
  const title = doc?.title || node.attrs.label;

  if (isCard) {
    const documentUnfurl = unfurlUrl ? unfurls.get(unfurlUrl)?.data : undefined;
    const isDocumentUnfurl =
      documentUnfurl?.type === UnfurlResourceType.Document;
    const collection = doc?.collectionId
      ? collections.get(doc.collectionId)
      : undefined;

    return (
      <Link
        {...attrs}
        className={className}
        to={`${documentPath}${hash}`}
        contentEditable={false}
      >
        <MentionCard
          icon={icon}
          title={title}
          description={isDocumentUnfurl ? documentUnfurl.summary : undefined}
          thumbnailUrl={
            isDocumentUnfurl ? documentUnfurl.thumbnailUrl : undefined
          }
          titleSuffix={
            collection
              ? t("in {{ collectionName }}", {
                  collectionName: collection.name,
                })
              : undefined
          }
        />
      </Link>
    );
  }

  return (
    <Link {...attrs} className={className} to={`${documentPath}${hash}`}>
      {icon}
      <span>{title}</span>
    </Link>
  );
});

export const MentionCollection = observer(function MentionCollection_(
  props: ComponentProps
) {
  const { isSelected, node } = props;
  const { collections } = useStores();
  const collection = collections.get(node.attrs.modelId);
  const modelId = node.attrs.modelId;
  const { className, unfurl, ...attrs } = getAttributesFromNode(
    node,
    isSelected
  );
  const sharePath = useSharePath();

  React.useEffect(() => {
    if (modelId) {
      void collections.fetch(modelId);
    }
  }, [modelId, collections]);

  const icon = collection?.icon ? (
    <Icon
      value={collection.icon}
      initial={collection.initial}
      color={collection.color}
      size={18}
    />
  ) : (
    <CollectionIcon size={18} />
  );
  const title = collection?.title || node.attrs.label;
  const to = sharePath(collection?.path ?? `/collection/${node.attrs.modelId}`);

  if (node.attrs.display === MentionDisplay.Card) {
    return (
      <Link {...attrs} className={className} to={to} contentEditable={false}>
        <MentionCard
          icon={icon}
          title={title}
          description={
            collection?.data
              ? ProsemirrorDataHelper.getFirstText(collection.data)
              : undefined
          }
        />
      </Link>
    );
  }

  return (
    <Link {...attrs} className={className} to={to}>
      {icon}
      <span>{title}</span>
    </Link>
  );
});

type IssuePrProps = ComponentProps & {
  onChangeUnfurl: (
    unfurl:
      | UnfurlResponse[UnfurlResourceType.Issue]
      | UnfurlResponse[UnfurlResourceType.PR]
  ) => void;
};

type IssueUrlProps = ComponentProps & {
  onChangeUnfurl: (unfurl: UnfurlResponse[UnfurlResourceType.URL]) => void;
};

export const MentionURL = (props: IssueUrlProps) => {
  const { unfurls } = useStores();
  const [loaded, setLoaded] = React.useState(false);
  const onChangeUnfurl = React.useRef(props.onChangeUnfurl).current; // stable reference to callback function.

  const { isSelected, node } = props;
  const {
    className,
    unfurl: unfurlAttr,
    ...attrs
  } = getAttributesFromNode(node, isSelected);

  const url = typeof attrs.href === "string" ? attrs.href : undefined;
  const unfurl = url ? (unfurls.get(url)?.data ?? unfurlAttr) : undefined;

  React.useEffect(() => {
    if (!url) {
      setLoaded(true);
      return;
    }

    // The node view may be destroyed before the fetch resolves, in which case
    // the editor transaction in onChangeUnfurl must not be dispatched.
    let cancelled = false;

    const fetchUnfurl = async () => {
      try {
        const unfurlModel = await unfurls.fetchUnfurl({ url });

        if (cancelled) {
          return;
        }

        // We got a result back from the server, so update the unfurl in the node attributes.
        if (unfurlModel) {
          onChangeUnfurl(
            unfurlModel.data satisfies UnfurlResponse[UnfurlResourceType.URL]
          );
          return;
        }

        const attrs = getAttributesFromNode(node);
        // If we have a unfurl attribute, use that.
        // Otherwise, set a basic unfurl to avoid refetching again in future.
        // This will just show the URL with a generic link icon.
        const data = attrs.unfurl
          ? attrs.unfurl
          : {
              title: toDisplayUrl(url),
              faviconUrl: cdnPath("/images/link.png"),
            };
        unfurls.add({
          id: url,
          type: UnfurlResourceType.URL,
          fetchedAt: new Date().toISOString(),
          data,
        });
      } finally {
        setLoaded(true);
      }
    };

    void fetchUnfurl();

    return () => {
      cancelled = true;
    };
  }, [unfurls, url, node, onChangeUnfurl]);

  if (!unfurl) {
    return !loaded ? (
      <MentionLoading className={className} />
    ) : (
      <MentionError className={className} />
    );
  }

  if (node.attrs.display === MentionDisplay.Card) {
    return (
      <LinkCard {...attrs} className={className} url={url} unfurl={unfurl} />
    );
  }

  return (
    <a
      {...attrs}
      className={className}
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      <Flex align="center" gap={6}>
        {unfurl.faviconUrl ? (
          <Logo src={sanitizeImageSrc(unfurl.faviconUrl)} alt="" />
        ) : null}
        <Text>
          <Backticks content={unfurl.title} />
        </Text>
      </Flex>
    </a>
  );
};

export const MentionIssue = observer((props: IssuePrProps) => {
  const { unfurls } = useStores();
  const [loaded, setLoaded] = React.useState(false);
  const onChangeUnfurl = React.useRef(props.onChangeUnfurl).current; // stable reference to callback function.

  const { isSelected, node } = props;
  const {
    className,
    unfurl: unfurlAttr,
    ...attrs
  } = getAttributesFromNode(node, isSelected);

  const unfurl = unfurls.get(attrs.href)?.data ?? unfurlAttr;

  React.useEffect(() => {
    // The node view may be destroyed before the fetch resolves, in which case
    // the editor transaction in onChangeUnfurl must not be dispatched.
    let cancelled = false;

    const fetchIssue = async () => {
      const unfurlModel = await unfurls.fetchUnfurl({ url: attrs.href });

      if (cancelled) {
        return;
      }

      if (unfurlModel) {
        onChangeUnfurl({
          ...unfurlModel.data,
          description: null,
        } satisfies UnfurlResponse[UnfurlResourceType.Issue]);
      }

      setLoaded(true);
    };

    void fetchIssue();

    return () => {
      cancelled = true;
    };
  }, [unfurls, attrs.href, onChangeUnfurl]);

  if (!unfurl) {
    return !loaded ? (
      <MentionLoading className={className} />
    ) : (
      <MentionError className={className} />
    );
  }

  const issue = unfurl as UnfurlResponse[UnfurlResourceType.Issue];

  return (
    <a
      {...attrs}
      className={className}
      href={attrs.href as string}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      <Flex align="center" gap={6}>
        <IssueStatusIcon size={14} state={issue.state} />
        <Flex align="center" gap={4}>
          <Text>
            <Backticks content={issue.title} />
          </Text>
          <Text type="tertiary">{issue.id}</Text>
        </Flex>
      </Flex>
    </a>
  );
});

type ProjectProps = ComponentProps & {
  onChangeUnfurl: (unfurl: UnfurlResponse[UnfurlResourceType.Project]) => void;
};

export const MentionProject = observer((props: ProjectProps) => {
  const { unfurls } = useStores();
  const [loaded, setLoaded] = React.useState(false);
  const onChangeUnfurl = React.useRef(props.onChangeUnfurl).current;

  const { isSelected, node } = props;
  const {
    className,
    unfurl: unfurlAttr,
    ...attrs
  } = getAttributesFromNode(node, isSelected);

  const unfurl = unfurls.get(attrs.href)?.data ?? unfurlAttr;

  React.useEffect(() => {
    // The node view may be destroyed before the fetch resolves, in which case
    // the editor transaction in onChangeUnfurl must not be dispatched.
    let cancelled = false;

    const fetchProject = async () => {
      const unfurlModel = await unfurls.fetchUnfurl({ url: attrs.href });

      if (cancelled) {
        return;
      }

      if (unfurlModel) {
        onChangeUnfurl({
          ...unfurlModel.data,
          description: null,
        } satisfies UnfurlResponse[UnfurlResourceType.Project]);
      }

      setLoaded(true);
    };

    void fetchProject();

    return () => {
      cancelled = true;
    };
  }, [unfurls, attrs.href, onChangeUnfurl]);

  if (!unfurl) {
    return !loaded ? (
      <MentionLoading className={className} />
    ) : (
      <MentionError className={className} />
    );
  }

  const project = unfurl as UnfurlResponse[UnfurlResourceType.Project];

  return (
    <a
      {...attrs}
      className={className}
      href={attrs.href as string}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      <Flex align="center" gap={6}>
        {project.avatarUrl ? (
          <ProjectAvatar src={sanitizeImageSrc(project.avatarUrl)} alt="" />
        ) : (
          <Squircle color={project.color} size={12} />
        )}
        <Flex align="center" gap={4}>
          <Text>
            <Backticks content={project.name} />
          </Text>
          <Text type="tertiary">
            {project.progress !== undefined
              ? `${Math.round(project.progress * 100)}%`
              : project.id}
          </Text>
        </Flex>
      </Flex>
    </a>
  );
});

export const MentionPullRequest = observer((props: IssuePrProps) => {
  const { unfurls } = useStores();
  const [loaded, setLoaded] = React.useState(false);
  const onChangeUnfurl = React.useRef(props.onChangeUnfurl).current; // stable reference to callback function.

  const { isSelected, node } = props;
  const {
    className,
    unfurl: unfurlAttr,
    ...attrs
  } = getAttributesFromNode(node, isSelected);

  const unfurl = unfurls.get(attrs.href)?.data ?? unfurlAttr;

  React.useEffect(() => {
    // The node view may be destroyed before the fetch resolves, in which case
    // the editor transaction in onChangeUnfurl must not be dispatched.
    let cancelled = false;

    const fetchPR = async () => {
      const unfurlModel = await unfurls.fetchUnfurl({ url: attrs.href });

      if (cancelled) {
        return;
      }

      if (unfurlModel) {
        onChangeUnfurl({
          ...unfurlModel.data,
          description: null,
        } satisfies UnfurlResponse[UnfurlResourceType.PR]);
      }

      setLoaded(true);
    };

    void fetchPR();

    return () => {
      cancelled = true;
    };
  }, [unfurls, attrs.href, onChangeUnfurl]);

  if (!unfurl) {
    return !loaded ? (
      <MentionLoading className={className} />
    ) : (
      <MentionError className={className} />
    );
  }

  const pullRequest = unfurl as UnfurlResponse[UnfurlResourceType.PR];

  return (
    <a
      {...attrs}
      className={className}
      href={attrs.href as string}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      <Flex align="center" gap={6}>
        <PullRequestIcon size={14} state={pullRequest.state} />
        <Flex align="center" gap={4}>
          <Text>
            <Backticks content={pullRequest.title} />
          </Text>
          <Text type="tertiary">{pullRequest.id}</Text>
        </Flex>
      </Flex>
    </a>
  );
});

type DateProps = ComponentProps & {
  onChangeDate: (modelId: string) => void;
};

// Loaded lazily so its browser-only dependencies (Radix, react-day-picker)
// don't enter the editor schema's static import graph, which is also used on
// the server.
const DateMentionPicker = lazyWithRetry(() => import("./DateMentionPicker"));

export const MentionDate = observer(function MentionDate_(props: DateProps) {
  const { isSelected, isEditable, node, onChangeDate } = props;
  const { t } = useTranslation();
  const { auth } = useStores();
  const { className, unfurl, ...attrs } = getAttributesFromNode(
    node,
    isSelected
  );

  const language = auth.user?.language;
  const iso = typeof node.attrs.modelId === "string" ? node.attrs.modelId : "";
  const display = dateToRelativeReadable(iso, t, language);
  const selectedDate = parseISODate(iso) ?? undefined;

  const content = (
    <DateMention {...attrs} className={className} $editable={isEditable}>
      {display}
    </DateMention>
  );

  if (!isEditable) {
    return content;
  }

  return (
    <React.Suspense fallback={content}>
      <DateMentionPicker
        selectedDate={selectedDate}
        includeTime={hasTimeComponent(iso)}
        language={language}
        onChange={onChangeDate}
      >
        {content}
      </DateMentionPicker>
    </React.Suspense>
  );
});

const MentionLoading = ({ className }: { className: string }) => {
  const { t } = useTranslation();

  return (
    <span className={className}>
      <Spinner />
      <Text type="tertiary">{`${t("Loading")}…`}</Text>
    </span>
  );
};

const MentionError = ({ className }: { className: string }) => {
  const { t } = useTranslation();

  return (
    <span className={className}>
      <StyledWarningIcon size={20} color={theme.danger} />
      <Text type="secondary">{`${t("Error loading data")}`}</Text>
    </span>
  );
};

const DateMention = styled.span<{ $editable: boolean }>`
  cursor: ${(props) => (props.$editable ? "pointer" : "default")};
  user-select: none;
`;

const StyledWarningIcon = styled(WarningIcon)`
  margin: 0 -2px;
`;

const Logo = styled.img`
  width: 16px;
  height: 16px;
`;

const ProjectAvatar = styled.img`
  width: 12px;
  height: 12px;
  border-radius: 2px;
`;
