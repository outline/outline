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
import styled from "styled-components";
import { Backticks } from "../../components/Backticks";
import Flex from "../../components/Flex";
import Icon from "../../components/Icon";
import { IssueStatusIcon } from "../../components/IssueStatusIcon";
import { PullRequestIcon } from "../../components/PullRequestIcon";
import Spinner from "../../components/Spinner";
import Text from "../../components/Text";
import useIsMounted from "../../hooks/useIsMounted";
import useStores from "../../hooks/useStores";
import theme from "../../styles/theme";
import {
  IntegrationService,
  type JSONValue,
  type UnfurlResourceType,
  type UnfurlResponse,
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
    unfurl: unfurl ? (JSON.parse(unfurl as any) as Attrs["unfurl"]) : undefined,
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

export const MentionIssue = observer((props: IssuePrProps) => {
  const { unfurls } = useStores();
  const isMounted = useIsMounted();
  const [loaded, setLoaded] = React.useState(false);
  const onChangeUnfurl = React.useRef(props.onChangeUnfurl).current; // stable reference to callback function.

  const { isSelected, node } = props;
  const {
    className,
    unfurl: unfurlAttr,
    ...attrs
  } = getAttributesFromNode(node);

  const unfurl = unfurls.get(attrs.href)?.data ?? unfurlAttr;

  React.useEffect(() => {
    const fetchIssue = async () => {
      const unfurlModel = await unfurls.fetchUnfurl({ url: attrs.href });

      if (!isMounted()) {
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
  }, [unfurls, attrs.href, isMounted, onChangeUnfurl]);

  if (!unfurl) {
    return !loaded ? (
      <MentionLoading className={className} />
    ) : (
      <MentionError className={className} />
    );
  }

  const issue = unfurl as UnfurlResponse[UnfurlResourceType.Issue];

  const url = new URL(issue.url);
  const service =
    url.hostname === "github.com"
      ? IntegrationService.GitHub
      : IntegrationService.Linear;

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
        <IssueStatusIcon size={14} service={service} state={issue.state} />
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

export const MentionPullRequest = observer((props: IssuePrProps) => {
  const { unfurls } = useStores();
  const isMounted = useIsMounted();
  const [loaded, setLoaded] = React.useState(false);
  const onChangeUnfurl = React.useRef(props.onChangeUnfurl).current; // stable reference to callback function.

  const { isSelected, node } = props;
  const {
    className,
    unfurl: unfurlAttr,
    ...attrs
  } = getAttributesFromNode(node);

  const unfurl = unfurls.get(attrs.href)?.data ?? unfurlAttr;

  React.useEffect(() => {
    const fetchPR = async () => {
      const unfurlModel = await unfurls.fetchUnfurl({ url: attrs.href });

      if (!isMounted()) {
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
  }, [unfurls, attrs.href, isMounted, onChangeUnfurl]);

  const sharedProps = {
    className: cn(className, {
      "ProseMirror-selectednode": isSelected,
    }),
  };

  if (!unfurl) {
    return !loaded ? (
      <MentionLoading {...sharedProps} />
    ) : (
      <MentionError {...sharedProps} />
    );
  }

  const pullRequest = unfurl as UnfurlResponse[UnfurlResourceType.PR];

  return (
    <a
      {...attrs}
      {...sharedProps}
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

const StyledWarningIcon = styled(WarningIcon)`
  margin: 0 -2px;
`;
