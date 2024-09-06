import * as React from "react";
import { MenuStateReturn } from "reakit";
import Model from "~/models/base/Model";

export type MenuContext<T extends Model> = {
  /** Model for which the menu is to be designed. */
  model: T;
  /** Menu state */
  menuState: MenuStateReturn;
};

export const MenuContext = React.createContext<MenuContext<Model>>(
  {} as MenuContext<Model>
);

export const useMenuContext = <T extends Model>() =>
  React.useContext<MenuContext<T>>(
    MenuContext as unknown as React.Context<MenuContext<T>>
  );
