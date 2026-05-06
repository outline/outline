import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Switch from "~/components/Switch";
import env from "~/env";
import Logger from "~/utils/Logger";
import Desktop from "~/utils/Desktop";
import SettingRow from "./SettingRow";

export function AutoLaunchSetting() {
  const { t } = useTranslation();
  const bridge = Desktop.bridge;
  const supported =
    Desktop.isElectron() && !!bridge?.getAutoLaunch && !!bridge?.setAutoLaunch;

  const [autoLaunch, setAutoLaunch] = React.useState<boolean | undefined>(
    undefined
  );

  React.useEffect(() => {
    if (!bridge?.getAutoLaunch) {
      return;
    }
    let cancelled = false;
    bridge
      .getAutoLaunch()
      .then((value) => {
        if (!cancelled) {
          setAutoLaunch(value);
        }
      })
      .catch((err: Error) => {
        Logger.error("Failed to read auto-launch state", err);
        if (!cancelled) {
          toast.error(t("Could not load preference"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bridge, t]);

  const handleChange = React.useCallback(
    async (checked: boolean) => {
      if (!bridge?.setAutoLaunch) {
        return;
      }
      try {
        const result = await bridge.setAutoLaunch(checked);
        setAutoLaunch(result);
        toast.success(t("Preferences saved"));
      } catch (err) {
        Logger.error("Failed to update auto-launch state", err as Error);
        toast.error(t("Could not save preference"));
      }
    },
    [bridge, t]
  );

  if (!supported) {
    return null;
  }

  const isLoading = autoLaunch === undefined;

  return (
    <SettingRow
      name="autoLaunch"
      label={t("Open on startup")}
      description={t(
        "Automatically launch {{ appName }} when you sign in to your computer.",
        { appName: env.APP_NAME }
      )}
    >
      <Switch
        id="autoLaunch"
        name="autoLaunch"
        checked={!!autoLaunch}
        disabled={isLoading}
        onChange={handleChange}
      />
    </SettingRow>
  );
}
