export class LifecycleManager {
  private static hooks = new Map();

  public static getHooks(target: any, lifecycle: string) {
    const key = `lifecycle:${lifecycle}`;
    const modelHooks = this.hooks.get(target.name);
    return modelHooks?.get(key) || [];
  }

  public static executeHooks(target: any, lifecycle: string, ...args: any[]) {
    const hooks = this.getHooks(target, lifecycle);
    hooks.forEach((hook: keyof typeof target) => {
      target[hook](...args);
    });
  }

  public static registerHook(
    target: any,
    propertyKey: string,
    lifecycle: string
  ) {
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

export function BeforeCreate(target: any, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "beforeCreate");
}

export function AfterCreate(target: any, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "afterCreate");
}

export function BeforeUpdate(target: any, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "beforeUpdate");
}

export function AfterUpdate(target: any, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "afterUpdate");
}

export function BeforeChange(target: any, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "beforeChange");
}

export function AfterChange(target: any, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "afterChange");
}

export function BeforeRemove(target: any, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "beforeRemove");
}

export function AfterRemove(target: any, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "afterRemove");
}

export function BeforeDelete(target: any, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "beforeDelete");
}

export function AfterDelete(target: any, propertyKey: string) {
  LifecycleManager.registerHook(target, propertyKey, "afterDelete");
}
