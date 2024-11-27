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
  onSuccess: () => void;
};

function DomainManagement({ onSuccess }: Props) {
  const team = useCurrentTeam();
  const { t } = useTranslation();

  const [allowedDomains, setAllowedDomains] = React.useState([
    ...(team.allowedDomains ?? []),
  ]);
  const [lastKnownDomainCount, updateLastKnownDomainCount] = React.useState(
    allowedDomains.length
  );

  const [existingDomainsTouched, setExistingDomainsTouched] =
    React.useState(false);

  const handleSaveDomains = React.useCallback(async () => {
    try {
      await team.save({ allowedDomains });
      onSuccess();
      setExistingDomainsTouched(false);
      updateLastKnownDomainCount(allowedDomains.length);
    } catch (err) {
      toast.error(err.message);
    }
  }, [team, allowedDomains, onSuccess]);

  const handleRemoveDomain = async (index: number) => {
    const newDomains = allowedDomains.filter((_, i) => index !== i);

    setAllowedDomains(newDomains);

    const touchedExistingDomain = index < lastKnownDomainCount;
    if (touchedExistingDomain) {
      setExistingDomainsTouched(true);
    }
  };

  const handleAddDomain = () => {
    const newDomains = [...allowedDomains, ""];

    setAllowedDomains(newDomains);
  };

  const createOnDomainChangedHandler =
    (index: number) => (ev: React.ChangeEvent<HTMLInputElement>) => {
      const newDomains = allowedDomains.slice();

      newDomains[index] = ev.currentTarget.value;
      setAllowedDomains(newDomains);

      const touchedExistingDomain = index < lastKnownDomainCount;
      if (touchedExistingDomain) {
        setExistingDomainsTouched(true);
      }
    };

  const showSaveChanges =
    existingDomainsTouched ||
    allowedDomains.filter((value: string) => value !== "").length > // New domains were added
      lastKnownDomainCount;

  return (
    <SettingRow
      label={t("Allowed domains")}
      name="allowedDomains"
      description={t(
        "The domains which should be allowed to create new accounts using SSO. Changing this setting does not affect existing user accounts."
      )}
    >
      {allowedDomains.map((domain, index) => (
        <Flex key={index} gap={4}>
          <Input
            key={index}
            id={`allowedDomains${index}`}
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
        {!allowedDomains.length ||
        allowedDomains[allowedDomains.length - 1] !== "" ? (
          <Button type="button" onClick={handleAddDomain} neutral>
            {allowedDomains.length ? (
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
