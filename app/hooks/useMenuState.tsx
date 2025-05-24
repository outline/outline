import * as React from "react";
import {
  // eslint-disable-next-line no-restricted-imports
  useMenuState as reakitUseMenuState,
  MenuStateReturn,
} from "reakit/Menu";
import { v4 } from "uuid";
import useMenuContext from "./useMenuContext";

/**
 * A hook that wraps Reakit's useMenuState with coordination logic to ensure
 * only one context menu can be open at a time across the application.
 */
export function useMenuState(
  options?: Parameters<typeof reakitUseMenuState>[0]
): MenuStateReturn {
  const menuState = reakitUseMenuState(options);
  const { registerMenu, unregisterMenu, closeOtherMenus } = useMenuContext();
  const menuId = React.useRef(`menu-${v4()}`).current;

  // Register this menu instance on mount and unregister on unmount
  React.useEffect(() => {
    registerMenu(menuId, menuState.hide);
    return () => unregisterMenu(menuId);
  }, [menuId, menuState.hide, registerMenu, unregisterMenu]);

  const coordinatedShow = React.useCallback(() => {
    closeOtherMenus(menuId);
    menuState.show();
  }, [closeOtherMenus, menuId, menuState]);

  const coordinatedToggle = React.useCallback(() => {
    closeOtherMenus(menuId);
    menuState.toggle();
  }, [menuId, menuState, closeOtherMenus]);

  // Return the menu state with the coordinated show method
  return {
    ...menuState,
    toggle: coordinatedToggle,
    show: coordinatedShow,
  };
}
