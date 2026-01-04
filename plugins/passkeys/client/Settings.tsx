import { startRegistration } from "@simplewebauthn/browser";
import { observer } from "mobx-react";
import { PadlockIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import Button from "~/components/Button";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import Time from "~/components/Time";
import { client } from "~/utils/ApiClient";
import SettingRow from "~/scenes/Settings/components/SettingRow";

type Passkey = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

function PasskeysSettings() {
  const { t } = useTranslation();
  const [passkeys, setPasskeys] = React.useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRegistering, setIsRegistering] = React.useState(false);

  const loadPasskeys = React.useCallback(async () => {
    try {
      const res = await client.post("/passkeys.list");
      setPasskeys(res.data || []);
    } catch (err) {
      toast.error(t("Failed to load passkeys"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  React.useEffect(() => {
    void loadPasskeys();
  }, [loadPasskeys]);

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const resp = await client.post(
        "/passkeys.generate-registration-options",
        undefined,
        {
          baseUrl: "/auth",
        }
      );
      const attResp = await startRegistration(resp.data);
      await client.post("/passkeys.verify-registration", attResp as any, {
        baseUrl: "/auth",
      });
      toast.success(t("Passkey added successfully"));
      await loadPasskeys();
    } catch (err) {
      toast.error(
        err.message || t("Failed to register passkey. Please try again.")
      );
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <Scene title={t("Passkeys")} icon={<PadlockIcon />}>
      <Heading>{t("Passkeys")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Passkeys allow you to sign in safely without a password using your
          device's biometric authentication (Face ID, Touch ID, Windows Hello)
          or security key.
        </Trans>
      </Text>

      {isLoading ? (
        <Text as="p" type="secondary">
          {t("Loading")}…
        </Text>
      ) : passkeys.length > 0 ? (
        <>
          <Heading as="h2">{t("Your Passkeys")}</Heading>
          {passkeys.map((pk) => (
            <SettingRow
              key={pk.id}
              name={`passkey-${pk.id}`}
              label={t("Passkey")}
              description={
                <>
                  {t("Registered")}{" "}
                  <Time dateTime={new Date(pk.createdAt).toISOString()} />
                </>
              }
            >
              <Button disabled neutral>
                {t("Active")}
              </Button>
            </SettingRow>
          ))}
        </>
      ) : (
        <Text as="p" type="secondary">
          {t("You don't have any passkeys yet.")}
        </Text>
      )}

      <br />
      <Button onClick={handleRegister} disabled={isRegistering}>
        {isRegistering ? `${t("Registering")}…` : t("Add Passkey")}
      </Button>
    </Scene>
  );
}

export default observer(PasskeysSettings);
