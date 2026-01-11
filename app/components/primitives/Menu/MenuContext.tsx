import { createContext, useContext, useMemo } from "react";

type MenuVariant = "dropdown" | "context" | "inline";

const MenuContext = createContext<{
  variant: MenuVariant;
}>({
  variant: "dropdown",
});

export function MenuProvider({
  variant,
  children,
}: {
  variant: MenuVariant;
  children: React.ReactNode;
}) {
  const ctx = useMemo(() => ({ variant }), [variant]);

  return <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>;
}

export const useMenuContext = () => useContext(MenuContext);
