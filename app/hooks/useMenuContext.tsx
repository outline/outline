import { noop } from "lodash";
import React from "react";

type MenuContextType = {
  openCount: boolean;
  setOpenCount: React.Dispatch<React.SetStateAction<boolean>>;
};

const MenuContext = React.createContext<MenuContextType | null>(null);

export const MenuProvider: React.FC = ({ children }) => {
  const [openCount, setOpenCount] = React.useState(false);
  const memoized = React.useMemo(
    () => ({
      openCount,
      setOpenCount,
    }),
    [openCount, setOpenCount]
  );

  return (
    <MenuContext.Provider value={memoized}>{children}</MenuContext.Provider>
  );
};

const useMenuContext: () => MenuContextType = () => {
  const value = React.useContext(MenuContext);
  return value ? value : { openCount: false, setOpenCount: noop };
};

export default useMenuContext;
