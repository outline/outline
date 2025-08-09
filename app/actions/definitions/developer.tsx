import Storage from "@shared/utils/Storage";
import copy from "copy-to-clipboard";
import {
  BeakerIcon,
  CopyIcon,
  EditIcon,
  ToolsIcon,
  TrashIcon,
  UserIcon,
} from "outline-icons";
import { toast } from "sonner";
import { createActionV2, createActionV2WithChildren } from "~/actions";
import { DeveloperSection } from "~/actions/sections";
import env from "~/env";
import { client } from "~/utils/ApiClient";
import { Feature, FeatureFlags } from "~/utils/FeatureFlags";
import Logger from "~/utils/Logger";
import { deleteAllDatabases } from "~/utils/developer";
import history from "~/utils/history";
import { homePath } from "~/utils/routeHelpers";

export const copyId = createActionV2WithChildren({
  name: ({ t }) => t("Copy ID"),
  icon: <CopyIcon />,
  keywords: "uuid",
  section: DeveloperSection,
  children: ({
    currentTeamId,
    currentUserId,
    activeCollectionId,
    activeDocumentId,
  }) => {
    function copyAndToast(text: string | null | undefined) {
      if (text) {
        copy(text);
        toast.success("Copied to clipboard");
      }
    }

    return [
      createActionV2({
        name: "Copy User ID",
        section: DeveloperSection,
        icon: <CopyIcon />,
        visible: () => !!currentUserId,
        perform: () => copyAndToast(currentUserId),
      }),
      createActionV2({
        name: "Copy Team ID",
        section: DeveloperSection,
        icon: <CopyIcon />,
        visible: () => !!currentTeamId,
        perform: () => copyAndToast(currentTeamId),
      }),
      createActionV2({
        name: "Copy Collection ID",
        icon: <CopyIcon />,
        section: DeveloperSection,
        visible: () => !!activeCollectionId,
        perform: () => copyAndToast(activeCollectionId),
      }),
      createActionV2({
        name: "Copy Document ID",
        icon: <CopyIcon />,
        section: DeveloperSection,
        visible: () => !!activeDocumentId,
        perform: () => copyAndToast(activeDocumentId),
      }),
      createActionV2({
        name: "Copy Team ID",
        icon: <CopyIcon />,
        section: DeveloperSection,
        visible: () => !!currentTeamId,
        perform: () => copyAndToast(currentTeamId),
      }),
      createActionV2({
        name: "Copy Release ID",
        icon: <CopyIcon />,
        section: DeveloperSection,
        visible: () => !!env.VERSION,
        perform: () => copyAndToast(env.VERSION),
      }),
    ];
  },
});

function generateRandomText() {
  const characters =
    "abcdefghijklmno pqrstuvwxyzABCDEFGHIJKL MNOPQRSTUVWXYZ 0123456789\n";
  let text = "";
  for (let i = 0; i < Math.floor(Math.random() * 10) + 1; i++) {
    text += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return text;
}

export const startTyping = createActionV2({
  name: "Start automatic typing",
  icon: <EditIcon />,
  section: DeveloperSection,
  visible: ({ activeDocumentId }) =>
    !!activeDocumentId && env.ENVIRONMENT === "development",
  perform: () => {
    const intervalId = setInterval(() => {
      const text = generateRandomText();
      document.execCommand("insertText", false, text);
    }, 250);

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && intervalId) {
        clearInterval(intervalId);
      }
    });

    toast.info("Automatic typing started, press Escape to stop");
  },
});

export const clearIndexedDB = createActionV2({
  name: ({ t }) => t("Clear IndexedDB cache"),
  icon: <TrashIcon />,
  keywords: "cache clear database",
  section: DeveloperSection,
  perform: async ({ t }) => {
    history.push(homePath());
    await deleteAllDatabases();
    toast.success(t("IndexedDB cache cleared"));
  },
});

export const clearStorage = createActionV2({
  name: ({ t }) => t("Clear local storage"),
  icon: <TrashIcon />,
  keywords: "cache clear localstorage",
  section: DeveloperSection,
  perform: ({ t }) => {
    Storage.clear();
    toast.success(t("Local storage cleared"));
  },
});

export const createTestUsers = createActionV2({
  name: "Create 10 test users",
  icon: <UserIcon />,
  section: DeveloperSection,
  visible: () => env.ENVIRONMENT === "development",
  perform: async () => {
    const count = 10;
    await client.post("/developer.create_test_users", { count });
    toast.message(`${count} test users created`);
  },
});

export const createToast = createActionV2({
  name: "Create toast",
  section: DeveloperSection,
  visible: () => env.ENVIRONMENT === "development",
  perform: () => {
    toast.message("Hello world", {
      duration: 30000,
    });
  },
});

export const toggleDebugLogging = createActionV2({
  name: ({ t }) => t("Toggle debug logging"),
  icon: <ToolsIcon />,
  section: DeveloperSection,
  perform: ({ t }) => {
    Logger.debugLoggingEnabled = !Logger.debugLoggingEnabled;
    toast.message(
      Logger.debugLoggingEnabled
        ? t("Debug logging enabled")
        : t("Debug logging disabled")
    );
  },
});

export const toggleDebugSafeArea = createActionV2({
  name: () => "Toggle menu safe area debugging",
  icon: <ToolsIcon />,
  section: DeveloperSection,
  visible: () => env.ENVIRONMENT === "development",
  perform: ({ stores }) => {
    stores.ui.toggleDebugSafeArea();
    toast.message(
      stores.ui.debugSafeArea
        ? "Menu safe area debugging enabled"
        : "Menu safe area debugging disabled"
    );
  },
});

export const toggleFeatureFlag = createActionV2WithChildren({
  name: "Toggle feature flag",
  icon: <BeakerIcon />,
  section: DeveloperSection,
  visible: () => env.ENVIRONMENT === "development",
  children: Object.values(Feature).map((flag) =>
    createActionV2({
      id: `flag-${flag}`,
      name: flag,
      selected: () => FeatureFlags.isEnabled(flag),
      section: DeveloperSection,
      perform: () => {
        if (FeatureFlags.isEnabled(flag)) {
          FeatureFlags.disable(flag);
          toast.success(`Disabled feature flag: ${flag}`);
        } else {
          FeatureFlags.enable(flag);
          toast.success(`Enabled feature flag: ${flag}`);
        }
      },
    })
  ),
});

export const developer = createActionV2WithChildren({
  name: ({ t }) => t("Development"),
  keywords: "debug",
  icon: <ToolsIcon />,
  iconInContextMenu: false,
  section: DeveloperSection,
  children: [
    copyId,
    toggleDebugLogging,
    toggleDebugSafeArea,
    toggleFeatureFlag,
    createToast,
    createTestUsers,
    clearIndexedDB,
    clearStorage,
    startTyping,
  ],
});

export const rootDeveloperActions = [developer];
