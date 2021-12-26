import { useRegisterActions } from "kbar";
import { flattenDeep } from "lodash";
import { useLocation } from "react-router-dom";
import { actionToKBar } from "~/actions";
import { Action } from "~/types";
import useActionContext from "./useActionContext";

export default function useCommandBarActions(actions: Action[]) {
  const location = useLocation();
  const context = useActionContext({
    isCommandBar: true,
  });

  const registerable = flattenDeep(
    actions.map((action) => actionToKBar(action, context))
  );

  useRegisterActions(registerable, [
    registerable.map((r) => r.id).join(""),
    location.pathname,
  ]);
}
