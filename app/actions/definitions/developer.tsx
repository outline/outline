import copy from "copy-to-clipboard";
import {
  BeakerIcon,
  CopyIcon,
  EditIcon,
  ToolsIcon,
  TrashIcon,
  UserIcon,
} from "outline-icons";
import * as React from "react";
import { toast } from "sonner";
import { createAction } from "~/actions";
import { DeveloperSection } from "~/actions/sections";
import env from "~/env";
import { client } from "~/utils/ApiClient";
import { Feature, FeatureFlags } from "~/utils/FeatureFlags";
import Logger from "~/utils/Logger";
import { deleteAllDatabases } from "~/utils/developer";
import history from "~/utils/history";
import { homePath } from "~/utils/routeHelpers";

export const copyId = createAction({
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
      createAction({
        name: "Copy User ID",
        section: DeveloperSection,
        icon: <CopyIcon />,
        visible: () => !!currentUserId,
        perform: () => copyAndToast(currentUserId),
      }),
      createAction({
        name: "Copy Team ID",
        section: DeveloperSection,
        icon: <CopyIcon />,
        visible: () => !!currentTeamId,
        perform: () => copyAndToast(currentTeamId),
      }),
      createAction({
        name: "Copy Collection ID",
        icon: <CopyIcon />,
        section: DeveloperSection,
        visible: () => !!activeCollectionId,
        perform: () => copyAndToast(activeCollectionId),
      }),
      createAction({
        name: "Copy Document ID",
        icon: <CopyIcon />,
        section: DeveloperSection,
        visible: () => !!activeDocumentId,
        perform: () => copyAndToast(activeDocumentId),
      }),
      createAction({
        name: "Copy Team ID",
        icon: <CopyIcon />,
        section: DeveloperSection,
        visible: () => !!currentTeamId,
        perform: () => copyAndToast(currentTeamId),
      }),
      createAction({
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

export const startTyping = createAction({
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
      if (event.key === "Escape") {
        intervalId && clearInterval(intervalId);
      }
    });

    toast.info("Automatic typing started, press Escape to stop");
  },
});

export const clearIndexedDB = createAction({
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

export const createTestUsers = createAction({
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

export const createToast = createAction({
  name: "Create toast",
  section: DeveloperSection,
  visible: () => env.ENVIRONMENT === "development",
  perform: () => {
    toast.message("Hello world", {
      duration: 30000,
    });
  },
});

export const toggleDebugLogging = createAction({
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

export const toggleFeatureFlag = createAction({
  name: "Toggle feature flag",
  icon: <BeakerIcon />,
  section: DeveloperSection,
  visible: () => env.ENVIRONMENT === "development",
  children: Object.values(Feature).map((flag) =>
    createAction({
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

export const developer = createAction({
  name: ({ t }) => t("Development"),
  keywords: "debug",
  icon: <ToolsIcon />,
  iconInContextMenu: false,
  section: DeveloperSection,
  children: [
    copyId,
    toggleDebugLogging,
    toggleFeatureFlag,
    createToast,
    createTestUsers,
    clearIndexedDB,
    startTyping,
  ],
});

export const rootDeveloperActions = [developer];
