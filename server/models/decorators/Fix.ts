/**
 * A decorator that must be applied to every model definition to workaround
 * babel <> typescript incompatibility. See the following issue:
 * https://github.com/RobinBuschmann/sequelize-typescript/issues/612#issuecomment-491890977
 *
 * @param target model class
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- decorator extends a Sequelize Model class with dynamic statics (rawAttributes, associations) that defy precise typing.
export default function Fix(target: any): void {
  return class extends target {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixin constructor must accept arbitrary Sequelize Model args.
    constructor(...args: any[]) {
      // suppresses warning from here which is not applicable in our typescript
      // environment: https://github.com/sequelize/sequelize/blob/00ced18c2cb2a8b99ae0ebf5669c124abb4c673d/src/model.js#L99
      target._overwrittenAttributesChecked = true;

      super(...args);

      const rawAttributes = Object.keys(new.target.rawAttributes);
      const associations = Object.keys(new.target.associations);

      rawAttributes.forEach((propertyKey) => {
        // check if we already defined getter/setter – if so, do not override
        const desc = Object.getOwnPropertyDescriptor(
          target.prototype,
          propertyKey
        );
        if (desc) {
          return;
        }

        Object.defineProperty(this, propertyKey, {
          get() {
            // Safety check for test serialization - getDataValue may not be available
            // during serialization for inter-process communication
            if (typeof this.getDataValue === "function") {
              return this.getDataValue(propertyKey);
            }
            // Fallback to direct dataValues access
            return this.dataValues?.[propertyKey];
          },
          set(value) {
            // Safety check for test serialization - setDataValue may not be available
            // during serialization for inter-process communication
            if (typeof this.setDataValue === "function") {
              this.setDataValue(propertyKey, value);
            } else if (this.dataValues) {
              // Fallback to direct dataValues assignment
              this.dataValues[propertyKey] = value;
            }
          },
        });
      });

      associations.forEach((propertyKey) => {
        Object.defineProperty(this, propertyKey, {
          get() {
            return this.dataValues[propertyKey];
          },
          set(value) {
            // sets without changing the "changed" flag for associations
            this.dataValues[propertyKey] = value;
          },
        });
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mixin class returned in place of original target; consumer expects original class shape.
  } as any;
}
