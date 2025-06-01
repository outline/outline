import noop from "lodash/noop";
import * as React from "react";

type MenuContextType = {
  openMenuHideFn: (() => void) | null;
  setOpenMenuHideFn: React.Dispatch<React.SetStateAction<(() => void) | null>>;
};

const MenuContext = React.createContext<MenuContextType | null>(null);

type Props = {
  children?: React.ReactNode;
};

export const MenuProvider: React.FC = ({ children }: Props) => {
  const [openMenuHideFn, setOpenMenuHideFn] = React.useState<(() => void) | null>(null);
  const memoized = React.useMemo(
    () => ({
      openMenuHideFn,
      setOpenMenuHideFn,
    }),
    [openMenuHideFn, setOpenMenuHideFn]
  );

  return (
    <MenuContext.Provider value={memoized}>{children}</MenuContext.Provider>
  );
};

const useMenuContext: () => MenuContextType = () => {
  const value = React.useContext(MenuContext);
  return value ? value : { openMenuHideFn: null, setOpenMenuHideFn: noop };
};

export default useMenuContext;
