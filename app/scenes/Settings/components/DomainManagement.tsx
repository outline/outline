import { observer } from "mobx-react";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import SettingRow from "./SettingRow";

type Props = {
  /** Callback when domains are saved successfully */
  onSuccess: () => void;
  /** Team field name to save to */
  fieldName: string;
  /** Label for the setting row */
  label: string;
  /** Description for the setting row */
  description: string;
  /** Default value when team field is null */
  defaultValue?: string[];
};

function DomainManagement({
  onSuccess,
  fieldName,
  label,
  description,
  defaultValue = [],
}: Props) {
  const team = useCurrentTeam();
  const { t } = useTranslation();

  const [domains, setDomains] = React.useState([
    ...((team[fieldName] as string[] | null) ?? defaultValue),
  ]);
  const [lastKnownDomainCount, updateLastKnownDomainCount] = React.useState(
    domains.length
  );

  const [existingDomainsTouched, setExistingDomainsTouched] =
    React.useState(false);

  const handleSaveDomains = React.useCallback(async () => {
    try {
      await team.save({ [fieldName]: domains });
      onSuccess();
      setExistingDomainsTouched(false);
      updateLastKnownDomainCount(domains.length);
    } catch (err) {
      toast.error(err.message);
    }
  }, [team, domains, fieldName, onSuccess]);

  const handleRemoveDomain = async (index: number) => {
    const newDomains = domains.filter((_, i) => index !== i);

    setDomains(newDomains);

    const touchedExistingDomain = index < lastKnownDomainCount;
    if (touchedExistingDomain) {
      setExistingDomainsTouched(true);
    }
  };

  const handleAddDomain = () => {
    const newDomains = [...domains, ""];

    setDomains(newDomains);
  };

  const createOnDomainChangedHandler =
    (index: number) => (ev: React.ChangeEvent<HTMLInputElement>) => {
      const newDomains = domains.slice();

      newDomains[index] = ev.currentTarget.value;
      setDomains(newDomains);

      const touchedExistingDomain = index < lastKnownDomainCount;
      if (touchedExistingDomain) {
        setExistingDomainsTouched(true);
      }
    };

  const showSaveChanges =
    existingDomainsTouched ||
    domains.filter((value: string) => value !== "").length > // New domains were added
      lastKnownDomainCount;

  return (
    <SettingRow label={label} name={fieldName} description={description}>
      {domains.map((domain, index) => (
        <Flex key={index} gap={4}>
          <Input
            key={index}
            id={`${fieldName}${index}`}
            value={domain}
            autoFocus={!domain}
            placeholder="example.com"
            required
            flex
            onChange={createOnDomainChangedHandler(index)}
          />
          <Remove>
            <Tooltip content={t("Remove domain")} placement="top">
              <NudeButton onClick={() => handleRemoveDomain(index)}>
                <CloseIcon />
              </NudeButton>
            </Tooltip>
          </Remove>
        </Flex>
      ))}

      <Flex justify="space-between" gap={4} style={{ flexWrap: "wrap" }}>
        {!domains.length || domains[domains.length - 1] !== "" ? (
          <Button type="button" onClick={handleAddDomain} neutral>
            {domains.length ? (
              <Trans>Add another</Trans>
            ) : (
              <Trans>Add a domain</Trans>
            )}
          </Button>
        ) : (
          <span />
        )}

        {showSaveChanges && (
          <Button
            type="button"
            onClick={handleSaveDomains}
            disabled={team.isSaving}
          >
            <Trans>Save changes</Trans>
          </Button>
        )}
      </Flex>
    </SettingRow>
  );
}

const Remove = styled("div")`
  margin-top: 6px;
`;

export default observer(DomainManagement);
