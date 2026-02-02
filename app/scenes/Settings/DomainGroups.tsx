import { observer } from "mobx-react";
import { GroupIcon } from "outline-icons";
import debounce from "lodash/debounce";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { toast } from "sonner";
import { TeamPreference } from "@shared/types";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import LoadingIndicator from "~/components/LoadingIndicator";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import useCurrentUser from "~/hooks/useCurrentUser";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import Group from "~/models/Group";
import { ViewGroupMembersDialog } from "./components/GroupDialogs";

/**
 * Manage domain-based groups and redirect URLs.
 *
 * @returns Domain groups settings scene.
 */
function DomainGroups() {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const { groups, dialogs } = useStores();
  const canEdit = user.isAdmin;

  const fetchGroups = React.useCallback(
    () => groups.fetchPage({ externalIdPrefix: "domain:" }),
    [groups]
  );
  const { loading } = useRequest(fetchGroups, true);

  const [redirects, setRedirects] = React.useState<Record<string, string>>(
    () =>
      (team.getPreference(TeamPreference.MemberRedirectURLByDomain) as
        | Record<string, string>
        | undefined) ?? {}
  );

  const [crmLinks, setCrmLinks] = React.useState<Record<string, string>>(
    () =>
      (team.getPreference(TeamPreference.DomainCRMURLByDomain) as
        | Record<string, string>
        | undefined) ?? {}
  );

  React.useEffect(() => {
    setRedirects(
      (team.getPreference(TeamPreference.MemberRedirectURLByDomain) as
        | Record<string, string>
        | undefined) ?? {}
    );
    setCrmLinks(
      (team.getPreference(TeamPreference.DomainCRMURLByDomain) as
        | Record<string, string>
        | undefined) ?? {}
    );
  }, [team.preferences]);

  const debouncedSave = React.useMemo(
    () =>
      debounce(async (next: Record<string, string>) => {
        await team.save({
          preferences: {
            ...(team.preferences ?? {}),
            [TeamPreference.MemberRedirectURLByDomain]: next,
          },
        });
        toast.success(t("Settings saved"));
      }, 500),
    [team, t]
  );

  const debouncedCrmSave = React.useMemo(
    () =>
      debounce(async (next: Record<string, string>) => {
        await team.save({
          preferences: {
            ...(team.preferences ?? {}),
            [TeamPreference.DomainCRMURLByDomain]: next,
          },
        });
        toast.success(t("Settings saved"));
      }, 500),
    [team, t]
  );

  React.useEffect(() => () => debouncedSave.cancel(), [debouncedSave]);
  React.useEffect(() => () => debouncedCrmSave.cancel(), [debouncedCrmSave]);

  const domainGroups = React.useMemo(
    () =>
      groups.orderedData.filter((group) =>
        group.externalId?.startsWith("domain:")
      ),
    [groups.orderedData]
  );

  const handleRedirectChange = (domain: string, value: string) => {
    if (!canEdit) {
      return;
    }
    const next = { ...redirects, [domain]: value };
    setRedirects(next);
    void debouncedSave(next);
  };

  const handleCrmChange = (domain: string, value: string) => {
    if (!canEdit) {
      return;
    }
    const next = { ...crmLinks, [domain]: value };
    setCrmLinks(next);
    void debouncedCrmSave(next);
  };

  const handleViewMembers = (group: Group) => {
    dialogs.openModal({
      title: t("Group members"),
      content: <ViewGroupMembersDialog group={group} />,
    });
  };

  return (
    <Scene title={t("Domain groups")} icon={<GroupIcon />}>
      <HeaderStack>
        <Heading>{t("Domain groups")}</Heading>
        <Text as="p" type="secondary">
          {t(
            "Manage domain-based groups and configure custom redirect URLs that greet people from the same email domain."
          )}
        </Text>
      </HeaderStack>

      {loading ? (
        <LoadingIndicator />
      ) : domainGroups.length === 0 ? (
        <EmptyState>
          <Text as="p" type="secondary">
            {t("We will automatically create a domain group the next time someone signs in with a new email domain.")}
          </Text>
        </EmptyState>
      ) : (
        <List>
          {domainGroups.map((group) => {
            const domain = group.externalId?.replace("domain:", "") ?? "";
            return (
              <DomainCard key={group.id}>
                <CardHeader>
                  <Avatar aria-hidden>{(domain || group.name).slice(0, 2).toUpperCase()}</Avatar>
                  <Flex column auto>
                    <DomainName weight="bold">{domain || group.name}</DomainName>
                    <MetaRow>
                      <MetaPill>{t("Members")}: {group.memberCount ?? 0}</MetaPill>
                      <MetaText>{t("Automatically managed")}</MetaText>
                    </MetaRow>
                  </Flex>
                </CardHeader>

                <RedirectBlock>
                  <LabelStack>
                    <LabelText>{t("Redirect URL")}</LabelText>
                    <LabelHint>
                      {t("Optional link shown after sign-in for this domain")}
                    </LabelHint>
                  </LabelStack>
                  <Input
                    label={t("Redirect URL")}
                    labelHidden
                    placeholder="https://example.com/user/{email}/"
                    value={redirects[domain] ?? ""}
                    disabled={!canEdit}
                    onChange={(ev) =>
                      handleRedirectChange(domain, ev.currentTarget.value)
                    }
                  />
                  {!canEdit && (
                    <Text as="p" type="secondary">
                      {t("Only administrators can edit redirect links.")}
                    </Text>
                  )}
                </RedirectBlock>

                <RedirectBlock>
                  <LabelStack>
                    <LabelText>{t("CRM URL")}</LabelText>
                    <LabelHint>
                      {t(
                        "Shown in profile for members of this email domain"
                      )}
                    </LabelHint>
                  </LabelStack>
                  <Input
                    label={t("CRM URL")}
                    labelHidden
                    placeholder="https://crm.example.com/users/{email}"
                    value={crmLinks[domain] ?? ""}
                    disabled={!canEdit}
                    onChange={(ev) =>
                      handleCrmChange(domain, ev.currentTarget.value)
                    }
                  />
                  {!canEdit && (
                    <Text as="p" type="secondary">
                      {t("Only administrators can edit CRM links.")}
                    </Text>
                  )}
                </RedirectBlock>

                <Actions>
                  <Button onClick={() => handleViewMembers(group)} neutral>
                    {t("View members")}
                  </Button>
                </Actions>
              </DomainCard>
            );
          })}
        </List>
      )}
    </Scene>
  );
}

const HeaderStack = styled(Flex)`
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
`;

const EmptyState = styled.div`
  padding: 32px;
  border-radius: 16px;
  background: ${(props) => props.theme.backgroundSecondary};
`;

const List = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
`;

const DomainCard = styled.div`
  border-radius: 18px;
  padding: 20px;
  background: ${(props) =>
    props.theme.isDark
      ? "linear-gradient(135deg, rgba(29, 33, 45, 0.94), rgba(9, 10, 16, 0.92))"
      : "linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)"};
  border: 1px solid ${(props) => props.theme.divider};
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const CardHeader = styled(Flex)`
  align-items: center;
  gap: 16px;
`;

const Avatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  letter-spacing: 0.02em;
  color: ${(props) => props.theme.white};
  background: ${(props) =>
    props.theme.isDark ? "linear-gradient(135deg, #5b8def, #a978ff)" : "linear-gradient(135deg, #6c63ff, #b46bff)"};
  flex-shrink: 0;
`;

const DomainName = styled(Text)`
  overflow-wrap: anywhere;
  font-size: 18px;
`;

const MetaRow = styled(Flex)`
  gap: 8px;
  align-items: center;
`;

const MetaPill = styled.span`
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  background: ${(props) => props.theme.backgroundSecondary};
`;

const MetaText = styled(Text)`
  font-size: 12px;
  color: ${(props) => props.theme.textSecondary};
`;

const RedirectBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const LabelStack = styled(Flex)`
  flex-direction: column;
  gap: 4px;
`;

const LabelText = styled(Text)`
  font-size: 13px;
  font-weight: 600;
`;

const LabelHint = styled(Text)`
  font-size: 12px;
  color: ${(props) => props.theme.textSecondary};
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

export default observer(DomainGroups);
