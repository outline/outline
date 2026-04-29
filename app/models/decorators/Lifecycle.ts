type ModelClass = { readonly name: string };
type Hook = (...args: unknown[]) => unknown;

export class LifecycleManager {
  private static hooks = new Map<string, Map<string, string[]>>();

  public static getHooks(target: ModelClass, lifecycle: string): string[] {
    const key = `lifecycle:${lifecycle}`;
    const modelHooks = this.hooks.get(target.name);
    return modelHooks?.get(key) ?? [];
  }

  public static executeHooks(
    target: ModelClass,
    lifecycle: string,
    ...args: unknown[]
  ): void {
    const hooks = this.getHooks(target, lifecycle);
    hooks.forEach((hook) => {
      const fn = (target as unknown as Record<string, Hook>)[hook];
      fn(...args);
    });
  }

  public static registerHook(
    target: ModelClass,
    propertyKey: string,
    lifecycle: string
  ): void {
    const key = `lifecycle:${lifecycle}`;
    let modelHooks = this.hooks.get(target.name);

    if (!modelHooks) {
      modelHooks = new Map();
      this.hooks.set(target.name, modelHooks);
    }

    let lifecycleHooks = modelHooks.get(key);
    if (!lifecycleHooks) {
      lifecycleHooks = [];
      modelHooks.set(key, lifecycleHooks);
    }

    lifecycleHooks.push(propertyKey);
  }
}

export function BeforeCreate(target: ModelClass, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "beforeCreate");
}

export function AfterCreate(target: ModelClass, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "afterCreate");
}

export function BeforeUpdate(target: ModelClass, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "beforeUpdate");
}

export function AfterUpdate(target: ModelClass, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "afterUpdate");
}

export function BeforeChange(target: ModelClass, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "beforeChange");
}

export function AfterChange(target: ModelClass, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "afterChange");
}

export function BeforeRemove(target: ModelClass, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "beforeRemove");
}

export function AfterRemove(target: ModelClass, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "afterRemove");
}

export function BeforeDelete(target: ModelClass, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "beforeDelete");
}

export function AfterDelete(target: ModelClass, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "afterDelete");
}
