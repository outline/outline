import { observer } from "mobx-react";
import {
  DocumentIcon,
  EmailIcon,
  CollectionIcon,
  WarningIcon,
} from "outline-icons";
import { Node } from "prosemirror-model";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Flex from "../../components/Flex";
import Icon from "../../components/Icon";
import { IssueStatusIcon } from "../../components/IssueStatusIcon";
import { PullRequestIcon } from "../../components/PullRequestIcon";
import Spinner from "../../components/Spinner";
import Text from "../../components/Text";
import useStores from "../../hooks/useStores";
import theme from "../../styles/theme";
import type {
  JSONValue,
  UnfurlResourceType,
  UnfurlResponse,
} from "../../types";
import { cn } from "../styles/utils";
import { ComponentProps } from "../types";

type Attrs = {
  className: string;
  unfurl?: UnfurlResponse[keyof UnfurlResponse];
} & Record<string, JSONValue>;

const getAttributesFromNode = (node: Node): Attrs => {
  const spec = node.type.spec.toDOM?.(node) as any as Record<
    string,
    JSONValue
  >[];
  const { class: className, "data-unfurl": unfurl, ...attrs } = spec[1];

  return {
    className: className as Attrs["className"],
    unfurl: unfurl as Attrs["unfurl"],
    ...attrs,
  };
};

export const MentionUser = observer(function MentionUser_(
  props: ComponentProps
) {
  const { isSelected, node } = props;
  const { users } = useStores();
  const user = users.get(node.attrs.modelId);
  const { className, unfurl, ...attrs } = getAttributesFromNode(node);

  return (
    <span
      {...attrs}
      className={cn(className, {
        "ProseMirror-selectednode": isSelected,
      })}
    >
      <EmailIcon size={18} />
      {user?.name || node.attrs.label}
    </span>
  );
});

export const MentionDocument = observer(function MentionDocument_(
  props: ComponentProps
) {
  const { isSelected, node } = props;
  const { documents } = useStores();
  const doc = documents.get(node.attrs.modelId);
  const modelId = node.attrs.modelId;
  const { className, unfurl, ...attrs } = getAttributesFromNode(node);

  React.useEffect(() => {
    if (modelId) {
      void documents.prefetchDocument(modelId);
    }
  }, [modelId, documents]);

  return (
    <Link
      {...attrs}
      className={cn(className, {
        "ProseMirror-selectednode": isSelected,
      })}
      to={doc?.path ?? `/doc/${node.attrs.modelId}`}
    >
      {doc?.icon ? (
        <Icon value={doc?.icon} color={doc?.color} size={18} />
      ) : (
        <DocumentIcon size={18} />
      )}
      {doc?.title || node.attrs.label}
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
  const { className, unfurl, ...attrs } = getAttributesFromNode(node);

  React.useEffect(() => {
    if (modelId) {
      void collections.fetch(modelId);
    }
  }, [modelId, collections]);

  return (
    <Link
      {...attrs}
      className={cn(className, {
        "ProseMirror-selectednode": isSelected,
      })}
      to={collection?.path ?? `/collection/${node.attrs.modelId}`}
    >
      {collection?.icon ? (
        <Icon value={collection?.icon} color={collection?.color} size={18} />
      ) : (
        <CollectionIcon size={18} />
      )}
      {collection?.title || node.attrs.label}
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

export const MentionIssue = (props: IssuePrProps) => {
  const { unfurls } = useStores();
  const [loaded, setLoaded] = React.useState(false);
  const onChangeUnfurl = React.useRef(props.onChangeUnfurl).current; // stable reference to callback function.

  const { isSelected, node } = props;
  const { className, unfurl, ...attrs } = getAttributesFromNode(node);

  React.useEffect(() => {
    const fetchIssue = async () => {
      const unfurledIssue: UnfurlResponse[UnfurlResourceType.Issue] =
        await unfurls.fetch(attrs.href);

      if (unfurledIssue) {
        onChangeUnfurl({
          ...unfurledIssue,
          description: null,
        } satisfies UnfurlResponse[UnfurlResourceType.Issue]);
      }

      setLoaded(true);
    };

    void fetchIssue();
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
      className={cn(className, {
        "ProseMirror-selectednode": isSelected,
      })}
      href={attrs.href as string}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      <Flex align="center" gap={6}>
        <IssueStatusIcon
          size={14}
          status={issue.state.name}
          color={issue.state.color}
        />
        <Flex align="center" gap={4}>
          <Text>{issue.title}</Text>
          <Text type="tertiary">{issue.id}</Text>
        </Flex>
      </Flex>
    </a>
  );
};

export const MentionPullRequest = (props: IssuePrProps) => {
  const { unfurls } = useStores();
  const [loaded, setLoaded] = React.useState(false);
  const onChangeUnfurl = React.useRef(props.onChangeUnfurl).current; // stable reference to callback function.

  const { isSelected, node } = props;
  const { className, unfurl, ...attrs } = getAttributesFromNode(node);

  React.useEffect(() => {
    const fetchPR = async () => {
      const unfurledPR: UnfurlResponse[UnfurlResourceType.PR] =
        await unfurls.fetch(attrs.href);

      if (unfurledPR) {
        onChangeUnfurl({
          ...unfurledPR,
          description: null,
        } satisfies UnfurlResponse[UnfurlResourceType.PR]);
      }

      setLoaded(true);
    };

    void fetchPR();
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
      className={cn(className, {
        "ProseMirror-selectednode": isSelected,
      })}
      href={attrs.href as string}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      <Flex align="center" gap={6}>
        <PullRequestIcon
          size={14}
          status={pullRequest.state.name}
          color={pullRequest.state.color}
        />
        <Flex align="center" gap={4}>
          <Text>{pullRequest.title}</Text>
          <Text type="tertiary">{pullRequest.id}</Text>
        </Flex>
      </Flex>
    </a>
  );
};

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
      <WarningIcon color={theme.danger} />
      <Text type="secondary">{`${t("Error loading data")}`}</Text>
    </span>
  );
};
