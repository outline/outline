import noop from "lodash/noop";
import React from "react";

type MenuContextType = {
  isMenuOpen: boolean;
  setIsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const MenuContext = React.createContext<MenuContextType | null>(null);

type Props = {
  children?: React.ReactNode;
};

export const MenuProvider: React.FC = ({ children }: Props) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const memoized = React.useMemo(
    () => ({
      isMenuOpen,
      setIsMenuOpen,
    }),
    [isMenuOpen, setIsMenuOpen]
  );

  return (
    <MenuContext.Provider value={memoized}>{children}</MenuContext.Provider>
  );
};

const useMenuContext: () => MenuContextType = () => {
  const value = React.useContext(MenuContext);
  return value ? value : { isMenuOpen: false, setIsMenuOpen: noop };
};

export default useMenuContext;
