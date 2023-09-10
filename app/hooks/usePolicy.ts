import * as React from "react";
import Model from "~/models/base/Model";
import useStores from "./useStores";

/**
 * Retrieve the abilities of a policy for a given entity, if the policy is not
 * located in the store, it will be fetched from the server.
 *
 * @param entity The model or model id
 * @returns The policy for the model
 */
export default function usePolicy(entity?: string | Model | null) {
  const { policies } = useStores();
  const triggered = React.useRef(false);
  const entityId = entity
    ? typeof entity === "string"
      ? entity
      : entity.id
    : "";

  React.useEffect(() => {
    if (entity && typeof entity !== "string") {
      // The policy for this model is missing and we haven't tried to fetch it
      // yet, go ahead and do that now. The force flag is needed otherwise the
      // network request will be skipped due to the model existing in the store
      if (!policies.get(entity.id) && !triggered.current) {
        triggered.current = true;
        void entity.store.fetch(entity.id, { force: true });
      }
    }
  }, [policies, entity]);

  return policies.abilities(entityId);
}
