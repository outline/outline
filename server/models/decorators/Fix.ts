/**
 * A decorator that must be applied to every model definition to workaround
 * babel<>typescript incompatibility.
 *
 * see: https://github.com/RobinBuschmann/sequelize-typescript/issues/612#issuecomment-491890977
 * @param target model class
 */

export default function Fix(target: any): void {
  return class extends target {
    constructor(...args: any[]) {
      super(...args);
      [
        ...Object.keys(new.target.rawAttributes),
        ...Object.keys(new.target.associations),
      ].forEach((propertyKey) => {
        Object.defineProperty(this, propertyKey, {
          get() {
            return this.getDataValue(propertyKey);
          },
          set(value) {
            this.setDataValue(propertyKey, value);
          },
        });
      });
    }
  } as any;
}
