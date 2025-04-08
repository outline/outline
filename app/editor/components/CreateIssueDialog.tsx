import { IssueSource } from "@shared/schema";
import { ellipsis } from "@shared/styles";
import { observer } from "mobx-react";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Modal from "~/components/Modal";
import PluginIcon from "~/components/PluginIcon";
import Text from "~/components/Text";
import useBoolean from "~/hooks/useBoolean";
import useRequest from "~/hooks/useRequest";
import { client } from "~/utils/ApiClient";

type Props = {
  issueTitle: string;
  open: boolean;
  onCreate: (source: IssueSource) => Promise<void>;
  onClose: () => void;
};

export const CreateIssueDialog = observer(
  ({ issueTitle, open, onCreate, onClose }: Props) => {
    const { t } = useTranslation();
    const [isCreating, setCreating, unsetCreating] = useBoolean();
    const [selectedSource, selectSource] = React.useState<IssueSource>();

    const {
      data: sources,
      loading,
      request,
    } = useRequest<IssueSource[]>(
      React.useCallback(async () => {
        try {
          const res = await client.post("/issues.list_sources");
          return res.data;
        } catch (err) {
          toast.error(t("Couldn't load issue sources, try again?"));
          throw err;
        }
      }, [t])
    );

    const handleCreateIssue = React.useCallback(async () => {
      setCreating();
      await onCreate(selectedSource!);
      unsetCreating();
    }, [selectedSource, onCreate, setCreating, unsetCreating]);

    React.useEffect(() => {
      if (open) {
        void request();
      } else {
        selectSource(undefined);
      }
    }, [open, request]);

    return (
      <Modal
        title={t("Create issue")}
        isOpen={open}
        onRequestClose={onClose}
        fullscreen={false}
      >
        <FlexContainer column>
          <ListContainer>
            {loading ? (
              "Loading..."
            ) : !sources?.length ? (
              "No source available"
            ) : (
              <Flex column gap={6}>
                {sources.map((source) => (
                  <SourceItem
                    key={source.id}
                    source={source}
                    selected={source === selectedSource}
                    onSelect={selectSource}
                  />
                ))}
              </Flex>
            )}
          </ListContainer>
          <Footer justify="space-between" align="center" gap={8}>
            <StyledText type="secondary">
              {selectedSource ? (
                <Trans
                  defaults="Create issue in <em>{{ location }}</em>"
                  values={{
                    location: `${selectedSource.account.name}/${selectedSource.name} `,
                  }}
                  components={{
                    em: <strong />,
                  }}
                />
              ) : (
                t("Select a source to create issue")
              )}
            </StyledText>
            <Button
              disabled={!selectedSource || isCreating}
              onClick={handleCreateIssue}
            >
              {isCreating ? `${t("Creating")}…` : t("Create")}
            </Button>
          </Footer>
        </FlexContainer>
      </Modal>
    );
  }
);

const SourceItem = ({
  source,
  selected,
  onSelect,
}: {
  source: IssueSource;
  selected: boolean;
  onSelect: (source: IssueSource) => void;
}) => (
  <SourceItemWrapper
    justify="space-between"
    onClick={() => onSelect(source)}
    $selected={selected}
  >
    <Text>{source.name}</Text>
    <Flex align="center" gap={2}>
      <PluginIcon id={source.service} size={20} />
      <SourceAccount type="tertiary" size="xsmall">
        {source.account.name}
      </SourceAccount>
    </Flex>
  </SourceItemWrapper>
);

export const FlexContainer = styled(Flex)`
  margin-left: -24px;
  margin-right: -24px;
  margin-bottom: -24px;
  outline: none;
`;

const ListContainer = styled.div`
  height: 65vh;
  padding: 0 24px 12px;
  overflow: scroll;

  ${breakpoint("tablet")`
    height: 40vh;
  `}
`;

const SourceAccount = styled(Text)``;

const SourceItemWrapper = styled(Flex)<{ $selected: boolean }>`
  font-size: 16px;
  cursor: var(--pointer);
  padding: 12px;
  border-radius: 6px;

  ${(props) =>
    props.$selected &&
    `
		background: ${props.theme.accent};
		color: ${props.theme.white};

		${SourceAccount} {
			color: ${props.theme.white};
		}

	`}

  ${breakpoint("tablet")`
		padding: 4px 6px;
		font-size: 15px;
	`}
`;

const Footer = styled(Flex)`
  height: 64px;
  border-top: 1px solid ${(props) => props.theme.horizontalRule};
  padding: 0 24px;
`;

const StyledText = styled(Text)`
  ${ellipsis()}
  margin-bottom: 0;
`;
