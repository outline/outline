import noop from "lodash/noop";
import * as React from "react";

type MenuContextType = {
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  registerMenu: (menuId: string, hideFunction: () => void) => void;
  unregisterMenu: (menuId: string) => void;
  closeOtherMenus: (...menuIds: (string | undefined)[]) => void;
};

const MenuContext = React.createContext<MenuContextType | null>(null);

// Registry to track all active menu instances
const menuRegistry = new Map();

type Props = {
  children?: React.ReactNode;
};

export const MenuProvider: React.FC = ({ children }: Props) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const registerMenu = React.useCallback(
    (menuId: string, hideFunction: () => void) => {
      menuRegistry.set(menuId, hideFunction);
    },
    []
  );

  const unregisterMenu = React.useCallback((menuId: string) => {
    menuRegistry.delete(menuId);
  }, []);

  const closeOtherMenus = React.useCallback(
    (...menuIds: (string | undefined)[]) => {
      menuRegistry.forEach((hideFunction, menuId) => {
        if (!menuIds.includes(menuId)) {
          hideFunction();
        }
      });
    },
    []
  );

  const memoized = React.useMemo(
    () => ({
      isMenuOpen,
      setIsMenuOpen,
      registerMenu,
      unregisterMenu,
      closeOtherMenus,
    }),
    [isMenuOpen, setIsMenuOpen, registerMenu, unregisterMenu, closeOtherMenus]
  );

  return (
    <MenuContext.Provider value={memoized}>{children}</MenuContext.Provider>
  );
};

const useMenuContext: () => MenuContextType = () => {
  const value = React.useContext(MenuContext);
  return value
    ? value
    : {
        isMenuOpen: false,
        setIsMenuOpen: noop,
        registerMenu: noop,
        unregisterMenu: noop,
        closeOtherMenus: noop,
      };
};

export default useMenuContext;
