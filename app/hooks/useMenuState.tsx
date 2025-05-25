import * as React from "react";
import {
  // eslint-disable-next-line no-restricted-imports
  useMenuState as reakitUseMenuState,
  MenuStateReturn,
} from "reakit/Menu";
import useMenuContext from "./useMenuContext";

type Props = Parameters<typeof reakitUseMenuState>[0] & {
  parentId?: string;
};

/**
 * A hook that wraps Reakit's useMenuState with coordination logic to ensure
 * only one context menu can be open at a time across the application.
 */
export function useMenuState(options?: Props): MenuStateReturn {
  const menuState = reakitUseMenuState(options);
  const { registerMenu, unregisterMenu, closeOtherMenus } = useMenuContext();
  const menuId = menuState.baseId;
  const parentId = options?.parentId;

  // Register this menu instance on mount and unregister on unmount
  React.useEffect(() => {
    registerMenu(menuId, menuState.hide);
    return () => unregisterMenu(menuId);
  }, [menuId, menuState.hide, registerMenu, unregisterMenu]);

  const coordinatedShow = React.useCallback(() => {
    closeOtherMenus(menuId, parentId);
    menuState.show();
  }, [closeOtherMenus, menuId, menuState, parentId]);

  const coordinatedToggle = React.useCallback(() => {
    closeOtherMenus(menuId, parentId);
    menuState.toggle();
  }, [menuId, menuState, closeOtherMenus, parentId]);

  // Return the menu state with the coordinated show method
  return React.useMemo(
    () => ({
      ...menuState,
      toggle: coordinatedToggle,
      show: coordinatedShow,
    }),
    [menuState, coordinatedToggle, coordinatedShow]
  );
}
