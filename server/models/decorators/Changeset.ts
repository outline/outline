import "reflect-metadata";

const key = Symbol("skipChangeset");

/**
 * This decorator is used to annotate a property as being skipped from being included in a changeset.
 */
export function SkipChangeset(target: any, propertyKey: string) {
  const properties: string[] = Reflect.getMetadata(key, target);

  if (!properties) {
    return Reflect.defineMetadata(key, [propertyKey], target);
  }

  properties.push(propertyKey);
}

/**
 * This function is used to get the properties that should be skipped from a changeset.
 */
export function getChangsetSkipped(target: any): string[] {
  return Reflect.getMetadata(key, target) || [];
}
