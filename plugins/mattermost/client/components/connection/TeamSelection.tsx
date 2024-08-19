import invariant from "invariant";
import { runInAction } from "mobx";
import { observer } from "mobx-react";
import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import Integration from "~/models/Integration";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import InputSelect, { Option } from "~/components/InputSelect";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { ServerData, TeamData, UserAndTeamsData } from "../../utils/types";

type Props = {
  serverData: ServerData;
  userAndTeams: UserAndTeamsData;
  onSave: () => void;
  onBack: () => void;
};

const TeamSelection = ({ serverData, userAndTeams, onSave, onBack }: Props) => {
  const { user, teams } = userAndTeams;

  const { t } = useTranslation();
  const { integrations } = useStores();
  const [saving, setSaving] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<TeamData>(teams[0]);

  const handleSave = React.useCallback(async () => {
    setSaving(true);
    try {
      const res = await client.post("/mattermost.connect", {
        url: serverData.url,
        apiKey: serverData.apiKey,
        user,
        team: selectedTeam,
      });
      runInAction(`create#${Integration.modelName}`, () => {
        invariant(res?.data, "Data should be available");
        integrations.add(res.data);
        integrations.addPolicies(res.policies);
      });
      toast.success(t("Mattermost connection successful"));
      onSave();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [selectedTeam]);

  return (
    <Flex column gap={12}>
      <div>
        <Text as="h3">Account details</Text>
        <Text as="p" type="secondary">
          <Trans>
            Please ensure that this account has access to create{" "}
            <Text weight="bold" type="secondary">
              incoming webhooks
            </Text>{" "}
            and{" "}
            <Text weight="bold" type="secondary">
              custom slash commands
            </Text>
            .
          </Trans>
        </Text>
      </div>
      <Flex justify="space-between">
        <UserDataItem title={t("Username")} value={user.name} />
        <UserDataItem title={t("Email")} value={user.email} />
      </Flex>
      <SelectTeam
        teams={teams}
        selectedTeam={selectedTeam}
        onSelect={(team: TeamData) => setSelectedTeam(team)}
      />
      <Flex justify="flex-end" gap={12} style={{ marginTop: "12px" }}>
        <Button neutral onClick={() => onBack()}>
          {t("Back")}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? `${t("Saving")}…` : t("Save")}
        </Button>
      </Flex>
    </Flex>
  );
};

const UserDataItem = ({ title, value }: { title: string; value: string }) => (
  <Flex column gap={4}>
    <Text weight="bold">{title}</Text>
    <Text type="secondary">{value}</Text>
  </Flex>
);

const SelectTeam = ({
  teams,
  selectedTeam,
  onSelect,
}: {
  teams: TeamData[];
  selectedTeam: TeamData;
  onSelect: (team: TeamData) => void;
}) => {
  const { t } = useTranslation();

  const options: Option[] = teams.map((team) => ({
    label: team.name,
    value: team.id,
  }));

  const handleChange = React.useCallback((teamId: string) => {
    const team = teams.find((tm) => tm.id === teamId);
    if (team) {
      onSelect(team);
    }
  }, []);

  return (
    <InputSelect
      label={t("Team")}
      ariaLabel={t("Team")}
      options={options}
      value={selectedTeam.id}
      onChange={handleChange}
    />
  );
};

export default observer(TeamSelection);
