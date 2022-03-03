import useStores from "./useStores";

/**
 * Quick access to retrieve the abilities of a policy for a given entity
 *
 * @param entityId The entity id
 * @returns The available abilities
 */
export default function usePolicy(entityId: string) {
  const { policies } = useStores();
  return policies.abilities(entityId);
}
