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
  const entityId = entity
    ? typeof entity === "string"
      ? entity
      : entity.id
    : "";

  React.useEffect(() => {
    if (
      entity &&
      typeof entity !== "string" &&
      !entity.isNew &&
      !entity.isSaving
    ) {
      // The policy for this model is missing, reload relationships for this model.
      if (!policies.get(entity.id)) {
        void entity.loadRelations();
      }
    }
  }, [policies, entity]);

  return policies.abilities(entityId);
}
