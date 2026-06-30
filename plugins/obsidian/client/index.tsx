import { t } from "i18next";
import * as React from "react";
import { cdnPath } from "@shared/utils/urls";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import { Obsidian } from "./Imports";

PluginManager.add([
  {
    ...config,
    type: Hook.Imports,
    value: {
      title: "Obsidian",
      subtitle: t("Import a zip file of Markdown notes exported from Obsidian"),
      icon: <img src={cdnPath("/images/obsidian.png")} alt="" width={28} />,
      action: <Obsidian />,
    },
  },
]);
