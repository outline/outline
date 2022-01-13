declare module "cancan" {
  import { Model } from "sequelize-typescript";

  namespace CanCan {
    interface Option {
      instanceOf?: ((instance: any, model: any) => boolean) | undefined;
      createError?: (() => any) | undefined;
    }
  }

  class CanCan {
    constructor(options?: CanCan.Option);

    allow<
      T extends new (...args: any) => any,
      U extends new (...args: any) => any
    >(
      model: U,
      actions: string | ReadonlyArray<string>,
      targets: T | ReadonlyArray<T> | string | ReadonlyArray<string>,
      condition?:
        | object
        | ((
            performer: InstanceType<U>,
            target: InstanceType<T> | null,
            options?: any
          ) => boolean)
    ): void;

    can(
      performer: Model,
      action: string,
      target: Model | null | undefined,
      options?: any
    ): boolean;

    cannot(
      performer: Model,
      action: string,
      target: Model | null | undefined,
      options?: any
    ): boolean;

    authorize(
      performer: Model,
      action: string,
      target: Model | null | undefined,
      options?: any
    ): asserts target;

    abilities: {
      model: any;
      action: string;
      target: any;
    }[];
  }

  export = CanCan;
}
