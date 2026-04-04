import type { RefObject } from "react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";

type MenuVariant = "dropdown" | "context" | "inline";

type MenuContextType = {
  variant: MenuVariant;
  activeSubmenu: string | null;
  setActiveSubmenu: (id: string | null) => void;
  submenuTriggerRefs: Record<string, RefObject<HTMLDivElement>>;
  addSubmenuTriggerRef: (id: string, ref: RefObject<HTMLDivElement>) => void;
  submenuContentRefs: Record<string, RefObject<HTMLDivElement | null>>;
  addSubmenuContentRef: (
    id: string,
    ref: RefObject<HTMLDivElement | null>
  ) => void;
  mainMenuRef: React.RefObject<HTMLDivElement>;
};

const MenuContext = createContext<MenuContextType>({
  variant: "dropdown",
  activeSubmenu: null,
  setActiveSubmenu: () => {},
  submenuTriggerRefs: {},
  addSubmenuTriggerRef: () => {},
  submenuContentRefs: {},
  addSubmenuContentRef: () => {},
  mainMenuRef: { current: null },
});

export function MenuProvider({
  variant,
  children,
}: {
  variant: MenuVariant;
  children: React.ReactNode;
}) {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [submenuTriggerRefs, setSubmenuTriggerRefs] = useState<
    Record<string, RefObject<HTMLDivElement>>
  >({});
  const [submenuContentRefs, setSubmenuContentRefs] = useState<
    Record<string, RefObject<HTMLDivElement | null>>
  >({});
  const mainMenuRef = useRef<HTMLDivElement>(null);
  const addSubmenuTriggerRef = useCallback(
    (key: string, ref: RefObject<HTMLDivElement>) => {
      setSubmenuTriggerRefs((prevRefs) => ({
        ...prevRefs,
        [key]: ref,
      }));
    },
    [setSubmenuTriggerRefs]
  );
  const addSubmenuContentRef = useCallback(
    (key: string, ref: RefObject<HTMLDivElement | null>) => {
      setSubmenuContentRefs((prevRefs) => ({
        ...prevRefs,
        [key]: ref,
      }));
    },
    [setSubmenuContentRefs]
  );

  const ctx = useMemo(
    () => ({
      variant,
      activeSubmenu,
      setActiveSubmenu,
      submenuTriggerRefs,
      addSubmenuTriggerRef,
      submenuContentRefs,
      addSubmenuContentRef,
      mainMenuRef,
    }),
    [
      variant,
      activeSubmenu,
      mainMenuRef,
      submenuTriggerRefs,
      addSubmenuTriggerRef,
      submenuContentRefs,
      addSubmenuContentRef,
    ]
  );

  return <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>;
}

export const useMenuContext = () => useContext(MenuContext);
