import { startRegistration } from "@simplewebauthn/browser";
import { observer } from "mobx-react";
import { KeyIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import Button from "~/components/Button";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import PlaceholderList from "~/components/List/Placeholder";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import PasskeyListItem from "./components/PasskeyListItem";
import RenamePasskeyDialog from "./components/RenamePasskeyDialog";
import { Action } from "~/components/Actions";
import usePolicy from "~/hooks/usePolicy";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import Notice from "~/components/Notice";
import DelayedMount from "~/components/DelayedMount";

type Passkey = {
  id: string;
  name: string;
  aaguid: string | null;
  userAgent: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function PasskeysSettings() {
  const { t } = useTranslation();
  const { dialogs } = useStores();
  const [passkeys, setPasskeys] = React.useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRegistering, setIsRegistering] = React.useState(false);

  const team = useCurrentTeam();
  const can = usePolicy(team);

  const loadPasskeys = React.useCallback(async () => {
    try {
      const res = await client.post("/passkeys.list");
      setPasskeys(res.data || []);
    } catch (_err) {
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
        "/passkeys.generateRegistrationOptions",
        undefined,
        {
          baseUrl: "/auth",
        }
      );
      const attResp = await startRegistration(resp.data);
      await client.post("/passkeys.verifyRegistration", attResp as any, {
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

  const handleRename = (passkeyId: string, currentName: string | null) => {
    dialogs.openModal({
      title: t("Rename passkey"),
      content: (
        <RenamePasskeyDialog
          passkeyId={passkeyId}
          currentName={currentName}
          onSuccess={async () => {
            await loadPasskeys();
            dialogs.closeAllModals();
          }}
        />
      ),
    });
  };

  const handleDelete = (passkeyId: string) => {
    dialogs.openModal({
      title: t("Delete passkey"),
      content: (
        <ConfirmationDialog
          onSubmit={async () => {
            try {
              await client.post("/passkeys.delete", { id: passkeyId });
              toast.success(t("Passkey deleted successfully"));
              await loadPasskeys();
            } catch (err) {
              toast.error(
                err.message || t("Failed to delete passkey. Please try again.")
              );
            }
          }}
          savingText={`${t("Deleting")}…`}
          danger
        >
          <Trans>
            Are you sure you want to delete this passkey? You will no longer be
            able to use it to sign in.
          </Trans>
        </ConfirmationDialog>
      ),
    });
  };

  return (
    <Scene
      title={t("Passkeys")}
      icon={<KeyIcon />}
      actions={
        <Action>
          <Button
            onClick={handleRegister}
            disabled={isRegistering || !can.createUserPasskey}
            icon={<PlusIcon />}
          >
            {isRegistering ? `${t("Registering")}…` : `${t("Add Passkey")}…`}
          </Button>
        </Action>
      }
    >
      <Heading>{t("Passkeys")}</Heading>
      <Text as="p" type="secondary">
        <Trans>
          Passkeys allow you to sign in safely without a password using your
          device's biometric authentication (Face ID, Touch ID, Windows Hello)
          or security key.
        </Trans>
      </Text>

      {team.passkeysEnabled === false && (
        <Notice>
          {t("Sign-in with Passkey is currently disabled for this team.")}{" "}
          {can.update
            ? t("Enable for all users in Settings -> Authentication.")
            : t("Contact a workspace admin to enable it.")}
        </Notice>
      )}

      {isLoading ? (
        <DelayedMount>
          <PlaceholderList count={5} />
        </DelayedMount>
      ) : passkeys.length > 0 ? (
        <>
          {passkeys.map((pk) => (
            <PasskeyListItem
              key={pk.id}
              passkey={pk}
              onRename={() => handleRename(pk.id, pk.name)}
              onDelete={() => handleDelete(pk.id)}
            />
          ))}
        </>
      ) : (
        <Text as="p" type="secondary">
          {t("You don't have any passkeys yet.")}
        </Text>
      )}
    </Scene>
  );
}

export default observer(PasskeysSettings);
