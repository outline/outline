import { observer } from "mobx-react";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { useSplitView } from "./SplitView/context";
import { useTeamContext } from "./TeamContext";

type FallbackProps = {
  /** The title to use while no descendant PageTitle is mounted. */
  title: string;
  children?: ReactNode;
};

/**
 * Renders a fallback document title that yields to any descendant PageTitle,
 * so that only a single title element is ever present in the head.
 */
export function FallbackPageTitle({ title, children }: FallbackProps) {
  const [claims, setClaims] = useState(0);
  const handleClaim = useCallback(() => {
    setClaims((count) => count + 1);
    return () => setClaims((count) => count - 1);
  }, []);

  return (
    <ClaimContext.Provider value={handleClaim}>
      {claims === 0 && <title>{title}</title>}
      {children}
    </ClaimContext.Provider>
  );
}

type Props = {
  title: string;
  favicon?: string;
};

const ClaimContext = createContext<(() => () => void) | undefined>(undefined);

const originalShortcutHref = document
  .querySelector('link[rel="shortcut icon"]')
  ?.getAttribute("href") as string;

const PageTitle = ({ title, favicon }: Props) => {
  const { auth } = useStores();
  const team = useTeamContext() ?? auth.team;
  const { isFocused } = useSplitView();
  const claim = useContext(ClaimContext);

  useLayoutEffect(
    () => (isFocused ? claim?.() : undefined),
    [claim, isFocused]
  );

  // Only the focused pane of a split view titles the tab, otherwise the panes
  // compete and the title depends on which rendered last.
  if (!isFocused) {
    return null;
  }

  return (
    <>
      <title>
        {team?.name ? `${title} - ${team.name}` : `${title} - ${env.APP_NAME}`}
      </title>
      <link
        rel="shortcut icon"
        type="image/png"
        href={favicon ?? originalShortcutHref}
        key={favicon ?? originalShortcutHref}
      />
    </>
  );
};

export default observer(PageTitle);
