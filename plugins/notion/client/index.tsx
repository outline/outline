import { t } from "i18next";
import * as React from "react";
import { cdnPath } from "@shared/utils/urls";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import { Notion } from "./Imports";

PluginManager.add([
  {
    ...config,
    type: Hook.Imports,
    value: {
      title: "Notion",
      subtitle: t("Import pages from Notion"),
      icon: <img src={cdnPath("/images/notion.png")} width={28} />,
      action: <Notion />,
    },
  },
]);
