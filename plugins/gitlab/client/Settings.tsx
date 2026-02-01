import find from "lodash/find";
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import { toast } from "sonner";
import { IntegrationService, IntegrationType } from "@shared/types";
import type Integration from "~/models/Integration";
import { ConnectedButton } from "~/scenes/Settings/components/ConnectedButton";
import { IntegrationScene } from "~/scenes/Settings/components/IntegrationScene";
import SettingRow from "~/scenes/Settings/components/SettingRow";
import { AvatarSize } from "~/components/Avatar";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import List from "~/components/List";
import ListItem from "~/components/List/Item";
import Notice from "~/components/Notice";
import PlaceholderText from "~/components/PlaceholderText";
import TeamLogo from "~/components/TeamLogo";
import Text from "~/components/Text";
import Time from "~/components/Time";
import env from "~/env";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import GitLabIcon from "./components/Icon";
import { GitLabConnectButton } from "./components/GitLabButton";

type FormData = {
  url: string;
};

function GitLab() {
  const { integrations } = useStores();
  const [removing, setRemoving] = React.useState(false);
  const { t } = useTranslation();
  const query = useQuery();
  const error = query.get("error");
  const installRequest = query.get("install_request");
  const appName = env.APP_NAME;

  const url = React.useMemo(() => {
    const integration = find(integrations.orderedData, {
      type: IntegrationType.Embed,
      service: IntegrationService.GitLab,
    }) as Integration<IntegrationType.Embed> | undefined;

    return integration?.settings?.gitlab?.url;
  }, [integrations.orderedData]);

  const {
    register,
    reset,
    handleSubmit: formHandleSubmit,
    formState,
    setValue,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      url,
    },
  });

  React.useEffect(() => {
    reset({
      url,
    });
  }, [reset, url]);

  const handleRemove = React.useCallback(async () => {
    try {
      setRemoving(true);

      for (const int of integrations.gitlab) {
        await integrations.save({
          id: int.id,
          type: IntegrationType.Embed,
          service: IntegrationService.GitLab,
          settings: {
            ...int.settings,
            gitlab: {
              ...int.settings?.gitlab,
              url: undefined,
            },
          } as Integration<IntegrationType.Embed>["settings"],
        });
      }

      setValue("url", "");
      toast.success(t("Settings saved"));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRemoving(false);
    }
  }, [integrations, t, setValue]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        const urlToSave = data.url.trim()
          ? data.url.trim().replace(/\/+$/, "") + "/"
          : undefined;

        for (const int of integrations.gitlab) {
          await integrations.save({
            id: int.id,
            type: IntegrationType.Embed,
            service: IntegrationService.GitLab,
            settings: {
              ...int.settings,
              gitlab: {
                ...int.settings?.gitlab,
                url: urlToSave,
              },
            } as Integration<IntegrationType.Embed>["settings"],
          });
        }

        // If no integrations exist yet, create one to store the URL
        if (integrations.gitlab.length === 0) {
          await integrations.save({
            type: IntegrationType.Embed,
            service: IntegrationService.GitLab,
            settings: {
              gitlab: {
                url: urlToSave,
              },
            } as Integration<IntegrationType.Embed>["settings"],
          });
        }

        toast.success(t("Settings saved"));
      } catch (err) {
        toast.error(err.message);
      }
    },
    [integrations, t]
  );

  React.useEffect(() => {
    void integrations.fetchAll({
      service: IntegrationService.GitLab,
      withRelations: true,
    });
  }, [integrations]);

  return (
    <IntegrationScene title="GitLab" icon={<GitLabIcon />}>
      <Heading>GitLab</Heading>

      {error && (
        <Notice>
          {error === "access_denied" ? (
            <Trans>
              Whoops, you need to accept the permissions in GitLab to connect{" "}
              {{ appName }} to your workspace. Try again?
            </Trans>
          ) : error === "unauthenticated" ? (
            <Trans>
              Something went wrong while authenticating your request. Please try
              logging in again.
            </Trans>
          ) : (
            <Trans>
              Something went wrong while authenticating your request. Please try
              again.
            </Trans>
          )}
        </Notice>
      )}
      {installRequest === "true" && (
        <Notice>
          <Trans>
            The owner of GitLab account has been requested to install the
            application. Once approved, previews will be shown for respective
            links.
          </Trans>
        </Notice>
      )}
      {env.GITLAB_CLIENT_ID ? (
        <>
          <Text as="p">
            <Trans>
              Enable previews of GitLab issues and merge requests in documents
              by connecting a GitLab organization or specific repositories to{" "}
              {appName}.
            </Trans>
          </Text>

          <Heading as="h2">{t("Installation URL")}</Heading>
          <Text as="p" type="secondary">
            <Trans>
              Configure a custom GitLab installation URL to use your own
              self-hosted instance. Leave empty to use default URL set in the
              environment configuration
            </Trans>
          </Text>
          <form onSubmit={formHandleSubmit(handleSubmit)}>
            <SettingRow
              label={t("GitLab URL")}
              name="url"
              description={t(
                "Configure a custom GitLab installation URL to use your own self-hosted instance. Leave empty to use default URL set in the environment configuration"
              )}
              border={false}
            >
              <Input
                placeholder="https://gitlab.com/"
                {...register("url", { required: false })}
              />
            </SettingRow>

            <Actions justify="end" gap={8}>
              <StyledButton
                danger
                disabled={!url || formState.isSubmitting}
                onClick={handleRemove}
                aria-label={t("Remove GitLab URL")}
                title={t("Remove GitLab URL")}
              >
                {removing ? `${t("Removing")}…` : t("Remove")}
              </StyledButton>
              <StyledButton
                type="submit"
                disabled={
                  !formState.isDirty ||
                  !formState.isValid ||
                  formState.isSubmitting
                }
                aria-label={t("Save GitLab URL")}
                title={t("Save GitLab URL")}
              >
                {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
              </StyledButton>
            </Actions>
          </form>

          {integrations.gitlab.some(
            (int) => int.settings.gitlab?.installation
          ) ? (
            <>
              <Heading as="h2">
                <Flex justify="space-between" auto>
                  {t("Connected")}
                  <GitLabConnectButton icon={<PlusIcon />} />
                </Flex>
              </Heading>
              <List>
                {integrations.gitlab.map((integration) => {
                  const gitlabAccount =
                    integration.settings?.gitlab?.installation?.account;
                  const integrationCreatedBy = integration.user
                    ? integration.user.name
                    : undefined;

                  return (
                    gitlabAccount && (
                      <ListItem
                        key={gitlabAccount?.id}
                        small
                        title={gitlabAccount?.name}
                        subtitle={
                          integrationCreatedBy ? (
                            <>
                              <Trans>
                                Enabled by {{ integrationCreatedBy }}
                              </Trans>{" "}
                              &middot;{" "}
                              <Time
                                dateTime={integration.createdAt}
                                relative={false}
                                format={{ en_US: "MMMM d, y" }}
                              />
                            </>
                          ) : (
                            <PlaceholderText />
                          )
                        }
                        image={
                          <TeamLogo
                            src={gitlabAccount?.avatarUrl}
                            size={AvatarSize.Large}
                          />
                        }
                        actions={
                          <ConnectedButton
                            onClick={integration.delete}
                            confirmationMessage={t(
                              "Disconnecting will prevent previewing GitLab links from this organization in documents. Are you sure?"
                            )}
                          />
                        }
                      />
                    )
                  );
                })}
              </List>
            </>
          ) : (
            <p>
              <GitLabConnectButton icon={<GitLabIcon />} />
            </p>
          )}
        </>
      ) : (
        <Notice>
          <Trans>
            The GitLab integration is currently disabled. Please set the
            associated environment variables and restart the server to enable
            the integration.{" "}
            <a href="#" target="_blank" rel="noopener noreferrer">
              Learn more
            </a>
          </Trans>
        </Notice>
      )}
    </IntegrationScene>
  );
}

const Actions = styled(Flex)`
  margin-top: 8px;
`;

const StyledButton = styled(Button)`
  width: 80px;
`;

export default observer(GitLab);
