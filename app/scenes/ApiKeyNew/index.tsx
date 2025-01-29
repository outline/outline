import { endOfDay } from "date-fns";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { ApiKeyValidation } from "@shared/validations";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import InputSelect, { Option } from "~/components/InputSelect";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import useUserLocale from "~/hooks/useUserLocale";
import { dateToExpiry } from "~/utils/date";
import "react-day-picker/dist/style.css";
import ExpiryDatePicker from "./components/ExpiryDatePicker";
import { ExpiryType, ExpiryValues, calculateExpiryDate } from "./utils";

type Props = {
  onSubmit: () => void;
};

function ApiKeyNew({ onSubmit }: Props) {
  const [name, setName] = React.useState("");
  const [scope, setScope] = React.useState("");
  const [expiryType, setExpiryType] = React.useState<ExpiryType>(
    ExpiryType.Week
  );
  const currentDate = React.useRef<Date>(new Date());
  const [expiresAt, setExpiresAt] = React.useState<Date | undefined>(() =>
    calculateExpiryDate(currentDate.current, expiryType)
  );
  const [isSaving, setIsSaving] = React.useState(false);

  const { apiKeys } = useStores();
  const { t } = useTranslation();
  const userLocale = useUserLocale();

  const submitDisabled =
    isSaving || !name || (!expiresAt && expiryType !== ExpiryType.NoExpiration);

  const expiryOptions = React.useMemo<Option[]>(
    () =>
      [...ExpiryValues.entries()].map(([expType, { label }]) => ({
        label,
        value: expType,
      })),
    []
  );

  const handleNameChange = React.useCallback((event) => {
    setName(event.target.value);
  }, []);

  const handleScopeChange = React.useCallback((event) => {
    setScope(event.target.value);
  }, []);

  const handleExpiryTypeChange = React.useCallback((value: string) => {
    const expiry = value as ExpiryType;
    setExpiryType(expiry);
    setExpiresAt(calculateExpiryDate(currentDate.current, expiry));
  }, []);

  const handleSelectCustomDate = React.useCallback((date: Date) => {
    setExpiresAt(endOfDay(date));
  }, []);

  const handleSubmit = React.useCallback(
    async (ev: React.SyntheticEvent) => {
      ev.preventDefault();
      setIsSaving(true);

      try {
        await apiKeys.create({
          name,
          expiresAt: expiresAt?.toISOString(),
          scope: scope ? scope.split(" ") : undefined,
        });
        toast.success(
          t(
            "API key created. Please copy the value now as it will not be shown again."
          )
        );
        onSubmit();
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSaving(false);
      }
    },
    [t, name, scope, expiresAt, onSubmit, apiKeys]
  );

  return (
    <form onSubmit={handleSubmit}>
      <Flex column>
        <Input
          type="text"
          label={t("Name")}
          placeholder={t("Development")}
          onChange={handleNameChange}
          value={name}
          minLength={ApiKeyValidation.minNameLength}
          maxLength={ApiKeyValidation.maxNameLength}
          required
          autoFocus
          flex
        />
        <Input
          type="text"
          label={t("Scopes")}
          placeholder="documents.info"
          onChange={handleScopeChange}
          value={scope}
          flex
        />
        <Text type="secondary" size="small" as="p">
          {t(
            "Space-separated scopes restrict the access of this API key to specific parts of the API. Leave blank for full access"
          )}
          .
        </Text>
        <Flex align="center" gap={16}>
          <StyledExpirySelect
            ariaLabel={t("Expiration")}
            label={t("Expiration")}
            value={expiryType}
            options={expiryOptions}
            onChange={handleExpiryTypeChange}
            skipBodyScroll
          />
          {expiryType === ExpiryType.Custom ? (
            <ExpiryDatePicker
              selectedDate={expiresAt}
              onSelect={handleSelectCustomDate}
            />
          ) : (
            <StyledExpiryText type="secondary" size="small">
              {expiresAt
                ? `${dateToExpiry(expiresAt.toString(), t, userLocale)}.`
                : `${t("Never expires")}.`}
            </StyledExpiryText>
          )}
        </Flex>
      </Flex>
      <Flex justify="flex-end">
        <Button type="submit" disabled={submitDisabled}>
          {isSaving ? `${t("Creating")}…` : t("Create")}
        </Button>
      </Flex>
    </form>
  );
}

const StyledExpirySelect = styled(InputSelect)`
  width: 150px;
`;

const StyledExpiryText = styled(Text)`
  position: relative;
  top: 4px;
`;

export default ApiKeyNew;
