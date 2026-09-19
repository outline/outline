import { t } from "i18next";
import * as React from "react";
import { cdnPath } from "@shared/utils/urls";
import { Hook, PluginManager } from "~/utils/PluginManager";
import config from "../plugin.json";
import { Slab } from "./Imports";

PluginManager.add([
  {
    ...config,
    type: Hook.Imports,
    value: {
      title: "Slab",
      subtitle: t("Import a zip file of Markdown documents exported from Slab"),
      icon: <img src={cdnPath("/images/slab.png")} alt="" width={28} />,
      action: <Slab />,
    },
  },
]);
