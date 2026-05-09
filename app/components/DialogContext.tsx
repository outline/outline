import { createContext, useContext, useMemo, useState } from "react";

export type DialogContext = {
  animating: boolean;
  setAnimating: (isAnimating: boolean) => void;
};

/**
 * Context for the dialogs (Guide/Modal) being rendered.
 * This helps control the dialog's behavior from within any nested component.
 */
const DialogContext = createContext<DialogContext>({
  animating: false,
  setAnimating: () => {},
});

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [animating, setAnimating] = useState(false);
  const ctx = useMemo<DialogContext>(
    () => ({
      animating,
      setAnimating,
    }),
    [animating]
  );

  return (
    <DialogContext.Provider value={ctx}>{children}</DialogContext.Provider>
  );
}

export const useDialogContext = () => useContext(DialogContext);
