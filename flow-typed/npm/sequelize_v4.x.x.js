// flow-typed signature: 9b2cb7cedee72afe6d144951c88d49a5
// flow-typed version: 03c38d65cd/sequelize_v4.x.x/flow_>=v0.42.x

// @flow

declare module "sequelize" {
  /**
   * The options for the getAssociation mixin of the belongsTo association.
   * @see  BelongsToGetOne
   */
  declare export type BelongsToGetOneOptions = {
    /**
     * Apply a scope on the related model, or remove its default scope by passing false.
     */
    scope?: ?(string | boolean)
  }


  /**
   * The getAssociation mixin applied to models with belongsTo.
   * An example of usage is as follows

  ```js

  User.belongsTo(Role);

  interface UserInstance extends Model<UserInstance, UserAttrib>, UserAttrib {
    getRole: BelongsToGetOne<RoleInstance>;
    // setRole...
    // createRole...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to/
   * @see  Model
  */
  declare export type BelongsToGetOne<TInstance: Model<any>> = {
    /**
     * Get the associated instance.
     * @param options The options to use when getting the association.
     */
    (options?: BelongsToGetOneOptions): Promise<?TInstance>
  }


  /**
   * The options for the setAssociation mixin of the belongsTo association.
   * @see  BelongsToSetOne
   */
  declare export type BelongsToSetOneOptions = {
    /**
     * Skip saving this after setting the foreign key if false.
     */
    save?: boolean
  }


  /**
   * The setAssociation mixin applied to models with belongsTo.
   * An example of usage is as follows:

  ```js

  User.belongsTo(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRole...
    setRole: BelongsToSetOne<RoleInstance, RoleId>;
    // createRole...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to/
   * @see  Model
  */
  declare export type BelongsToSetOne<TInstance: Model<any>, TInstancePrimaryKey> = {
    /**
     * Set the associated instance.
     * @param newAssociation An instance or the primary key of an instance to associate with this. Pass null or undefined to remove the association.
     * @param options the options passed to `this.save`.
     */
    (newAssociation: ?(TInstance | TInstancePrimaryKey), options?: BelongsToSetOneOptions & InstanceSaveOptions<any>): Promise<void>
  }

  /**
   * The options for the createAssociation mixin of the belongsTo association.
   * @see  BelongsToCreateOne
   */
  declare export type BelongsToCreateOneOptions = {}


  /**
   * The createAssociation mixin applied to models with belongsTo.
   * An example of usage is as follows:

  ```js

  User.belongsTo(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRole...
    // setRole...
    createRole: BelongsToCreateOne<RoleAttributes>;
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to/
   * @see  Model
  */
  declare export type BelongsToCreateOne<TInitAttributes> = {
    /**
     * Create a new instance of the associated model and associate it with this.
     * @param values The values used to create the association.
     * @param options The options passed to `target.create` and `setAssociation`.
     */
    (values?: TInitAttributes, options?: BelongsToCreateOneOptions & CreateOptions<any> & BelongsToSetOneOptions): Promise<void>
  }


  /**
   * The options for the getAssociation mixin of the hasOne association.
   * @see  HasOneGetOne
   */
  declare export type HasOneGetOneOptions = {
    /**
     * Apply a scope on the related model, or remove its default scope by passing false.
     */
    scope?: ?(string | boolean)
  }


  /**
   * The getAssociation mixin applied to models with hasOne.
   * An example of usage is as follows:

  ```js

  User.hasOne(Role);

  interface UserInstance extends Model<UserInstance, UserAttrib>, UserAttrib {
    getRole: HasOneGetOne<RoleInstance>;
    // setRole...
    // createRole...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-one/
   * @see  Model
  */
  declare export type HasOneGetOne<TInstance: Model<any>> = {
    /**
     * Get the associated instance.
     * @param options The options to use when getting the association.
     */
    (options?: HasOneGetOneOptions): Promise<?TInstance>
  }


  /**
   * The options for the setAssociation mixin of the hasOne association.
   * @see  HasOneSetOne
   */
  declare export type HasOneSetOneOptions = {
    /**
     * Skip saving this after setting the foreign key if false.
     */
    save?: boolean
  }


  /**
   * The setAssociation mixin applied to models with hasOne.
   * An example of usage is as follows:

  ```js

  User.hasOne(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRole...
    setRole: HasOneSetOne<RoleInstance, RoleId>;
    // createRole...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-one/
   * @see  Model
  */
  declare export type HasOneSetOne<TInstance: Model<any>, TInstancePrimaryKey> = {
    /**
     * Set the associated instance.
     * @param newAssociation An instance or the primary key of an instance to associate with this. Pass null or undefined to remove the association.
     * @param options The options passed to `getAssocation` and `target.save`.
     */
    (newAssociation: ?(TInstance | TInstancePrimaryKey), options?: HasOneSetOneOptions & HasOneGetOneOptions & InstanceSaveOptions<any>): Promise<void>
  }


  /**
   * The options for the createAssociation mixin of the hasOne association.
   * @see  HasOneCreateOne
   */
  declare export type HasOneCreateOneOptions = {}


  /**
   * The createAssociation mixin applied to models with hasOne.
   * An example of usage is as follows:

  ```js

  User.hasOne(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRole...
    // setRole...
    createRole: HasOneCreateOne<RoleAttributes>;
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-one/
   * @see  Model
  */
  declare export type HasOneCreateOne<TInitAttributes> = {
    /**
     * Create a new instance of the associated model and associate it with this.
     * @param values The values used to create the association.
     * @param options The options passed to `target.create` and `setAssociation`.
     */
    (values?: TInitAttributes, options?: HasOneCreateOneOptions & HasOneSetOneOptions & CreateOptions<any>): Promise<void>
  }


  /**
   * The options for the getAssociations mixin of the hasMany association.
   * @see  HasManyGetMany
   */
  declare export type HasManyGetManyOptions = {
    /**
     * An optional where clause to limit the associated models.
     */
    where?: WhereOptions,

    /**
     * Apply a scope on the related model, or remove its default scope by passing false.
     */
    scope?: ?(string | boolean)
  }


  /**
   * The getAssociations mixin applied to models with hasMany.
   * An example of usage is as follows:

  ```js

  User.hasMany(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    getRoles: HasManyGetMany<RoleInstance>;
    // setRoles...
    // addRoles...
    // addRole...
    // createRole...
    // removeRole...
    // removeRoles...
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-many/
   * @see  Model
  */
  declare export type HasManyGetMany<TInstance: Model<any>> = {
    /**
     * Get everything currently associated with this, using an optional where clause.
     * @param options The options to use when getting the associations.
     */
    (options?: HasManyGetManyOptions): Promise<TInstance[]>
  }


  /**
   * The options for the setAssociations mixin of the hasMany association.
   * @see  HasManySetMany
   */
  declare export type HasManySetManyOptions = {
    /**
     * Run validation for the join model.
     */
    validate?: boolean
  }


  /**
   * The setAssociations mixin applied to models with hasMany.
   * An example of usage is as follows:

  ```js

  User.hasMany(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    setRoles: HasManySetMany<RoleInstance, RoleId>;
    // addRoles...
    // addRole...
    // createRole...
    // removeRole...
    // removeRoles...
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-many/
   * @see  Model
  */
  declare export type HasManySetMany<TInstance: Model<any>, TInstancePrimaryKey> = {
    /**
     * Set the associated models by passing an array of instances or their primary keys.
     * Everything that it not in the passed array will be un-associated.
     * @param newAssociations An array of instances or primary key of instances to associate with this. Pass null or undefined to remove all associations.
     * @param options The options passed to `target.findAll` and `update`.
     */
    (newAssociations: ?$ReadOnlyArray<TInstance | TInstancePrimaryKey>, options?: HasManySetManyOptions & AnyFindOptions & InstanceUpdateOptions<any>): Promise<void>
  }


  /**
   * The options for the addAssociations mixin of the hasMany association.
   * @see  HasManyAddMany
   */
  declare export type HasManyAddManyOptions = {
    /**
     * Run validation for the join model.
     */
    validate?: boolean
  }


  /**
   * The addAssociations mixin applied to models with hasMany.
   * An example of usage is as follows:

  ```js

  User.hasMany(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    addRoles: HasManyAddMany<RoleInstance, RoleId>;
    // addRole...
    // createRole...
    // removeRole...
    // removeRoles...
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-many/
   * @see  Model
  */
  declare export type HasManyAddMany<TInstance: Model<any>, TInstancePrimaryKey> ={
    /**
     * Associate several instances with this.
     * @param newAssociations An array of instances or primary key of instances to associate with this.
     * @param options The options passed to `target.update`.
     */
    (newAssociations: $ReadOnlyArray<TInstance | TInstancePrimaryKey>, options?: HasManyAddManyOptions & InstanceUpdateOptions<any>): Promise<void>
  }


  /**
   * The options for the addAssociation mixin of the hasMany association.
   * @see  HasManyAddOne
   */
  declare export type HasManyAddOneOptions = {
    /**
     * Run validation for the join model.
     */
    validate?: boolean
  }


  /**
   * The addAssociation mixin applied to models with hasMany.
   * An example of usage is as follows:

  ```js

  User.hasMany(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    addRole: HasManyAddOne<RoleInstance, RoleId>;
    // createRole...
    // removeRole...
    // removeRoles...
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-many/
   * @see  Model
  */
  declare export type HasManyAddOne<TInstance: Model<any>, TInstancePrimaryKey> = {
    /**
     * Associate an instance with this.
     * @param newAssociation An instance or the primary key of an instance to associate with this.
     * @param options The options passed to `target.update`.
     */
    (newAssociation: TInstance | TInstancePrimaryKey, options?: HasManyAddOneOptions & InstanceUpdateOptions<any>): Promise<void>
  }


  /**
   * The options for the createAssociation mixin of the hasMany association.
   * @see  HasManyCreateOne
   */
  declare export type HasManyCreateOneOptions = {}


  /**
   * The createAssociation mixin applied to models with hasMany.
   * An example of usage is as follows:

  ```js

  User.hasMany(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    // addRole...
    createRole: HasManyCreateOne<RoleAttributes>;
    // removeRole...
    // removeRoles...
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-many/
   * @see  Model
  */
  declare export type HasManyCreateOne<TInitAttributes, TInstance: Model<any, TInitAttributes>> = {
    /**
     * Create a new instance of the associated model and associate it with this.
     * @param values The values used to create the association.
     * @param options The options to use when creating the association.
     */
    (values?: TInitAttributes, options?: HasManyCreateOneOptions & CreateOptions<any>): Promise<TInstance>
  }


  /**
   * The options for the removeAssociation mixin of the hasMany association.
   * @see  HasManyRemoveOne
   */
  declare export type HasManyRemoveOneOptions = {}


  /**
   * The removeAssociation mixin applied to models with hasMany.
   * An example of usage is as follows:

  ```js

  User.hasMany(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    // addRole...
    // createRole...
    removeRole: HasManyRemoveOne<RoleInstance, RoleId>;
    // removeRoles...
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-many/
   * @see  Model
  */
  declare export type HasManyRemoveOne<TInstance: Model<any>, TInstancePrimaryKey> = {
    /**
     * Un-associate the instance.
     * @param oldAssociated The instance or the primary key of the instance to un-associate.
     * @param options The options passed to `target.update`.
     */
    (oldAssociated: TInstance | TInstancePrimaryKey, options?: HasManyRemoveOneOptions & InstanceUpdateOptions<any>): Promise<void>
  }


  /**
   * The options for the removeAssociations mixin of the hasMany association.
   * @see  HasManyRemoveMany
   */
  declare export type HasManyRemoveManyOptions = {}


  /**
   * The removeAssociations mixin applied to models with hasMany.
   * An example of usage is as follows:

  ```js

  User.hasMany(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    // addRole...
    // createRole...
    // removeRole...
    removeRoles: HasManyRemoveMany<RoleInstance, RoleId>;
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-many/
   * @see  Model
  */
  declare export type HasManyRemoveMany<TInstance: Model<any>, TInstancePrimaryKey> = {
    /**
     * Un-associate several instances.
     * @param oldAssociated An array of instances or primary key of instances to un-associate.
     * @param options The options passed to `target.update`.
     */
    (oldAssociateds?: $ReadOnlyArray<TInstance | TInstancePrimaryKey>, options?: HasManyRemoveManyOptions & InstanceUpdateOptions<any>): Promise<void>
  }


  /**
   * The options for the hasAssociation mixin of the hasMany association.
   * @see  HasManyHasOne
   */
  declare export type HasManyHasOneOptions = {}


  /**
   * The hasAssociation mixin applied to models with hasMany.
   * An example of usage is as follows:

  ```js

  User.hasMany(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    // addRole...
    // createRole...
    // removeRole...
    // removeRoles...
    hasRole: HasManyHasOne<RoleInstance, RoleId>;
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-many/
   * @see  Model
  */
  declare export type HasManyHasOne<TInstance: Model<any>, TInstancePrimaryKey> = {
    /**
     * Check if an instance is associated with this.
     * @param target The instance or the primary key of the instance to check.
     * @param options The options passed to `getAssociations`.
     */
    (target: TInstance | TInstancePrimaryKey, options?: HasManyHasOneOptions & HasManyGetManyOptions): Promise<boolean>
  }


  /**
   * The options for the hasAssociations mixin of the hasMany association.
   * @see  HasManyHasMany
   */
  declare export type HasManyHasManyOptions = {}


  /**
   * The removeAssociations mixin applied to models with hasMany.
   * An example of usage is as follows:

  ```js

  User.hasMany(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    // addRole...
    // createRole...
    // removeRole...
    // removeRoles
    // hasRole...
    hasRoles: HasManyHasMany<RoleInstance, RoleId>;
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-many/
   * @see  Model
  */
  declare export type HasManyHasMany<TInstance: Model<any>, TInstancePrimaryKey> = {
    /**
     * Check if all instances are associated with this.
     * @param targets An array of instances or primary key of instances to check.
     * @param options The options passed to `getAssociations`.
     */
    (targets: $ReadOnlyArray<TInstance | TInstancePrimaryKey>, options?: HasManyHasManyOptions & HasManyGetManyOptions): Promise<boolean>
  }


  /**
   * The options for the countAssociations mixin of the hasMany association.
   * @see  HasManyCount
   */
  declare export type HasManyCountOptions = {
    /**
     * An optional where clause to limit the associated models.
     */
    where?: WhereOptions,

    /**
     * Apply a scope on the related model, or remove its default scope by passing false.
     */
    scope?: ?(string | boolean)
  }


  /**
   * The countAssociations mixin applied to models with hasMany.
   * An example of usage is as follows:

  ```js

  User.hasMany(Role);

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    // addRole...
    // createRole...
    // removeRole...
    // removeRoles...
    // hasRole...
    // hasRoles...
    countRoles: HasManyCount;
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/has-many/
   * @see  Model
  */
  declare export type HasManyCount = {
    /**
     * Count everything currently associated with this, using an optional where clause.
     * @param options The options to use when counting the associations.
     */
    (options?: HasManyCountOptions): Promise<number>
  }


  /**
   * The options for the getAssociations mixin of the belongsToMany association.
   * @see  BelongsToManyGetMany
   */
  declare export type BelongsToManyGetManyOptions = {
    /**
     * An optional where clause to limit the associated models.
     */
    where?: WhereOptions,

    /**
     * Apply a scope on the related model, or remove its default scope by passing false.
     */
    scope?: ?(string | boolean)
  }


  /**
   * The getAssociations mixin applied to models with belongsToMany.
   * An example of usage is as follows:

  ```js

  User.belongsToMany(Role, { through: UserRole });

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    getRoles: BelongsToManyGetMany<RoleInstance>;
    // setRoles...
    // addRoles...
    // addRole...
    // createRole...
    // removeRole...
    // removeRoles...
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to-many/
   * @see  Model
  */
  declare export type BelongsToManyGetMany<TInstance: Model<any>> = {
    /**
     * Get everything currently associated with this, using an optional where clause.
     * @param options The options to use when getting the associations.
     */
    (options?: BelongsToManyGetManyOptions): Promise<TInstance[]>
  }


  /**
   * The options for the setAssociations mixin of the belongsToMany association.
   * @see  BelongsToManySetMany
   */
  declare export type BelongsToManySetManyOptions = {
    /**
     * Run validation for the join model.
     */
    validate?: boolean
  }


  /**
   * The setAssociations mixin applied to models with belongsToMany.
   * An example of usage is as follows:

  ```js

  User.belongsToMany(Role, { through: UserRole });

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    setRoles: BelongsToManySetMany<RoleInstance, RoleId, UserRoleAttributes>;
    // addRoles...
    // addRole...
    // createRole...
    // removeRole...
    // removeRoles...
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to-many/
   * @see  Model
  */
  declare export type BelongsToManySetMany<TInstance: Model<any>, TInstancePrimaryKey, TJoinTableAttributes> = {
    /**
     * Set the associated models by passing an array of instances or their primary keys.
     * Everything that it not in the passed array will be un-associated.
     * @param newAssociations An array of instances or primary key of instances to associate with this. Pass null or undefined to remove all associations.
     * @param options The options passed to `through.findAll`, `bulkCreate`, `update` and `destroy`. Can also hold additional attributes for the join table.
     */
    (newAssociations: ?($ReadOnlyArray<TInstance | TInstancePrimaryKey>), options?: BelongsToManySetManyOptions &
      AnyFindOptions &
      BulkCreateOptions<any> &
      InstanceUpdateOptions<any> &
      InstanceDestroyOptions &
      {
        through?: TJoinTableAttributes
      }): Promise<void>
  }


  /**
   * The options for the addAssociations mixin of the belongsToMany association.
   * @see  BelongsToManyAddMany
   */
  declare export type BelongsToManyAddManyOptions = {
    /**
     * Run validation for the join model.
     */
    validate?: boolean
  }


  /**
   * The addAssociations mixin applied to models with belongsToMany.
   * An example of usage is as follows:

  ```js

  User.belongsToMany(Role, { through: UserRole });

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    addRoles: BelongsToManyAddMany<RoleInstance, RoleId, UserRoleAttributes>;
    // addRole...
    // createRole...
    // removeRole...
    // removeRoles...
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to-many/
   * @see  Model
  */
  declare export type BelongsToManyAddMany<TInstance: Model<any>, TInstancePrimaryKey, TJoinTableAttributes> = {
    /**
     * Associate several instances with this.
     * @param newAssociations An array of instances or primary key of instances to associate with this.
     * @param options The options passed to `through.findAll`, `bulkCreate`, `update` and `destroy`. Can also hold additional attributes for the join table.
     */
    (newAssociations: $ReadOnlyArray<TInstance | TInstancePrimaryKey>, options?: BelongsToManyAddManyOptions &
      AnyFindOptions &
      BulkCreateOptions<any> &
      InstanceUpdateOptions<any> &
      InstanceDestroyOptions &
      {
        through?: TJoinTableAttributes
      }): Promise<void>
  }


  /**
   * The options for the addAssociation mixin of the belongsToMany association.
   * @see  BelongsToManyAddOne
   */
  declare export type BelongsToManyAddOneOptions = {
    /**
     * Run validation for the join model.
     */
    validate?: boolean
  }


  /**
   * The addAssociation mixin applied to models with belongsToMany.
   * An example of usage is as follows:

  ```js

  User.belongsToMany(Role, { through: UserRole });

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    addRole: BelongsToManyAddOne<RoleInstance, RoleId, UserRoleAttributes>;
    // createRole...
    // removeRole...
    // removeRoles...
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to-many/
   * @see  Model
  */
  declare export type BelongsToManyAddOne<TInstance: Model<any>, TInstancePrimaryKey, TJoinTableAttributes> = {
    /**
     * Associate an instance with this.
     * @param newAssociation An instance or the primary key of an instance to associate with this.
     * @param options The options passed to `through.findAll`, `bulkCreate`, `update` and `destroy`. Can also hold additional attributes for the join table.
     */
    (newAssociation: TInstance | TInstancePrimaryKey, options?: BelongsToManyAddOneOptions &
      AnyFindOptions &
      BulkCreateOptions<any> &
      InstanceUpdateOptions<any> &
      InstanceDestroyOptions &
      {
        through?: TJoinTableAttributes
      }): Promise<void>
  }


  /**
   * The options for the createAssociation mixin of the belongsToMany association.
   * @see  BelongsToManyCreateOne
   */
  declare export type BelongsToManyCreateOneOptions = {}


  /**
   * The createAssociation mixin applied to models with belongsToMany.
   * An example of usage is as follows:

  ```js

  User.belongsToMany(Role, { through: UserRole });

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    // addRole...
    createRole: BelongsToManyCreateOne<RoleAttributes, UserRoleAttributes>;
    // removeRole...
    // removeRoles...
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to-many/
   * @see  Model
  */
  declare export type BelongsToManyCreateOne<TInitAttributes, TInstance: Model<any, TInitAttributes>, TJoinTableAttributes> = {
    /**
     * Create a new instance of the associated model and associate it with this.
     * @param values The values used to create the association.
     * @param options Options passed to `create` and `add`. Can also hold additional attributes for the join table.
     */
    (values?: TInitAttributes, options?: BelongsToManyCreateOneOptions & CreateOptions<any> & {
      through?: TJoinTableAttributes
    }): Promise<TInstance>
  }


  /**
   * The options for the removeAssociation mixin of the belongsToMany association.
   * @see  BelongsToManyRemoveOne
   */
  declare export type BelongsToManyRemoveOneOptions = {}


  /**
   * The removeAssociation mixin applied to models with belongsToMany.
   * An example of usage is as follows:

  ```js

  User.belongsToMany(Role, { through: UserRole });

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    // addRole...
    // createRole...
    removeRole: BelongsToManyRemoveOne<RoleInstance, RoleId>;
    // removeRoles...
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to-many/
   * @see  Model
  */
  declare export type BelongsToManyRemoveOne<TInstance: Model<any>, TInstancePrimaryKey> = {
    /**
     * Un-associate the instance.
     * @param oldAssociated The instance or the primary key of the instance to un-associate.
     * @param options The options passed to `through.destroy`.
     */
    (oldAssociated: TInstance | TInstancePrimaryKey, options?: BelongsToManyRemoveOneOptions & InstanceDestroyOptions): Promise<void>
  }


  /**
   * The options for the removeAssociations mixin of the belongsToMany association.
   * @see  BelongsToManyRemoveMany
   */
  declare export type BelongsToManyRemoveManyOptions = {}


  /**
   * The removeAssociations mixin applied to models with belongsToMany.
   * An example of usage is as follows:

  ```js

  User.belongsToMany(Role, { through: UserRole });

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    // addRole...
    // createRole...
    // removeRole...
    removeRoles: BelongsToManyRemoveMany<RoleInstance, RoleId>;
    // hasRole...
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to-many/
   * @see  Model
  */
  declare export type BelongsToManyRemoveMany<TInstance: Model<any>, TInstancePrimaryKey> = {
    /**
     * Un-associate several instances.
     * @param oldAssociated An array of instances or primary key of instances to un-associate.
     * @param options The options passed to `through.destroy`.
     */
    (oldAssociateds?: $ReadOnlyArray<TInstance | TInstancePrimaryKey>, options?: BelongsToManyRemoveManyOptions & InstanceDestroyOptions): Promise<void>
  }


  /**
   * The options for the hasAssociation mixin of the belongsToMany association.
   * @see  BelongsToManyHasOne
   */
  declare export type BelongsToManyHasOneOptions = {}


  /**
   * The hasAssociation mixin applied to models with belongsToMany.
   * An example of usage is as follows:

  ```js

  User.belongsToMany(Role, { through: UserRole });

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    // addRole...
    // createRole...
    // removeRole...
    // removeRoles...
    hasRole: BelongsToManyHasOne<RoleInstance, RoleId>;
    // hasRoles...
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to-many/
   * @see  Model
  */
  declare export type BelongsToManyHasOne<TInstance: Model<any>, TInstancePrimaryKey> = {
    /**
     * Check if an instance is associated with this.
     * @param target The instance or the primary key of the instance to check.
     * @param options The options passed to `getAssociations`.
     */
    (target: TInstance | TInstancePrimaryKey, options?: BelongsToManyHasOneOptions & BelongsToManyGetManyOptions): Promise<boolean>
  }


  /**
   * The options for the hasAssociations mixin of the belongsToMany association.
   * @see  BelongsToManyHasMany
   */
  declare export type BelongsToManyHasManyOptions = {}


  /**
   * The removeAssociations mixin applied to models with belongsToMany.
   * An example of usage is as follows:

  ```js

  User.belongsToMany(Role, { through: UserRole });

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    // addRole...
    // createRole...
    // removeRole...
    // removeRoles
    // hasRole...
    hasRoles: BelongsToManyHasMany<RoleInstance, RoleId>;
    // countRoles...
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to-many/
   * @see  Model
  */
  declare export type BelongsToManyHasMany<TInstance: Model<any>, TInstancePrimaryKey> = {
    /**
     * Check if all instances are associated with this.
     * @param targets An array of instances or primary key of instances to check.
     * @param options The options passed to `getAssociations`.
     */
    (targets: $ReadOnlyArray<TInstance | TInstancePrimaryKey>, options?: BelongsToManyHasManyOptions & BelongsToManyGetManyOptions): Promise<boolean>
  }


  /**
   * The options for the countAssociations mixin of the belongsToMany association.
   * @see  BelongsToManyCount
   */
  declare export type BelongsToManyCountOptions = {
    /**
     * An optional where clause to limit the associated models.
     */
    where?: WhereOptions,

    /**
     * Apply a scope on the related model, or remove its default scope by passing false.
     */
    scope?: ?(string | boolean)
  }


  /**
   * The countAssociations mixin applied to models with belongsToMany.
   * An example of usage is as follows:

  ```js

  User.belongsToMany(Role, { through: UserRole });

  interface UserInstance extends Model<UserInstance, UserAttributes>, UserAttributes {
    // getRoles...
    // setRoles...
    // addRoles...
    // addRole...
    // createRole...
    // removeRole...
    // removeRoles...
    // hasRole...
    // hasRoles...
    countRoles: BelongsToManyCount;
  }
  ```
   * @see  http://docs.sequelizejs.com/en/latest/api/associations/belongs-to-many/
   * @see  Model
  */
  declare export type BelongsToManyCount = {
    /**
     * Count everything currently associated with this, using an optional where clause.
     * @param options The options to use when counting the associations.
     */
    (options?: BelongsToManyCountOptions): Promise<number>
  }


  /**
   * Foreign Key Options
   * @see  AssociationOptions
   */
  declare export type AssociationForeignKeyOptions = ColumnOptions & {
    /**
     * Attribute name for the relation
     */
    name?: string
  }



  /**
   * Options provided when associating models
   * @see  Association class
   */
  declare export type AssociationOptions = {
    /**
     * Set to true to run before-/afterDestroy hooks when an associated model is deleted because of a cascade.
     * For example if `User.hasOne(Profile, {onDelete: 'cascade', hooks:true})`, the before-/afterDestroy hooks
    for profile will be called when a user is deleted. Otherwise the profile will be deleted without invoking
    any hooks.

    Defaults to false
    */
    hooks?: boolean,

    /**
     * The alias of this model, in singular form. See also the `name` option passed to `sequelize.define`. If
     * you create multiple associations between the same tables, you should provide an alias to be able to
    distinguish between them. If you provide an alias when creating the assocition, you should provide the
    same alias when eager loading and when getting assocated models. Defaults to the singularized name of
    target
    */
    as?: string | {
      singular: string,
      plural: string
    },

    /**
     * The name of the foreign key in the target table or an object representing the type definition for the
     * foreign column (see `Sequelize.define` for syntax). When using an object, you can add a `name` property
    to set the name of the column. Defaults to the name of source + primary key of source
    */
    foreignKey?: string | AssociationForeignKeyOptions,

    /**
     * What happens when delete occurs.
     *
    Cascade if this is a n:m, and set null if it is a 1:m

    Defaults to 'SET_NULL' or 'CASCADE'
    */
    onDelete?: string,

    /**
     * What happens when update occurs
     *
    Defaults to 'CASCADE'
    */
    onUpdate?: string,

    /**
     * Should on update and on delete constraints be enabled on the foreign key.
     */
    constraints?: boolean,
    foreignKeyConstraint?: boolean
  }


  /**
   * Options for Association Scope
   * @see  AssociationOptionsManyToMany
   */
  declare export type AssociationScope = {
    [scopeName: string]: any
  }


  /**
   * Options provided for many-to-many relationships
   * @see  AssociationOptionsHasMany
   * @see  AssociationOptionsBelongsToMany
   */
  declare export type AssociationOptionsManyToMany = AssociationOptions & {
    /**
     * A key/value set that will be used for association create and find defaults on the target.
     * (sqlite not supported for N:M)
     */
    scope?: ?AssociationScope
  }



  /**
   * Options provided when associating models with hasOne relationship
   * @see  Association class hasOne method
   */
  declare export type AssociationOptionsHasOne = AssociationOptions & {
    /**
     * A string or a data type to represent the identifier in the table
     */
    keyType?: DataTypeAbstract
  }



  /**
   * Options provided when associating models with belongsTo relationship
   * @see  Association class belongsTo method
   */
  declare export type AssociationOptionsBelongsTo = AssociationOptions & {
    /**
     * The name of the field to use as the key for the association in the target table. Defaults to the primary
     * key of the target table
     */
    targetKey?: string,

    /**
     * A string or a data type to represent the identifier in the table
     */
    keyType?: DataTypeAbstract
  }



  /**
   * Options provided when associating models with hasMany relationship
   * @see  Association class hasMany method
   */
  declare export type AssociationOptionsHasMany = AssociationOptionsManyToMany & {
    /**
     * A string or a data type to represent the identifier in the table
     */
    keyType?: DataTypeAbstract
  }



  /**
   * Options provided when associating models with belongsToMany relationship
   * @see  Association class belongsToMany method
   */
  declare export type AssociationOptionsBelongsToMany<Through: Model<any>> = AssociationOptionsManyToMany & {
    /**
     * The name of the table that is used to join source and target in n:m associations. Can also be a
     * sequelize
    model if you want to define the junction table yourself and add extra attributes to it.

    In 3.4.1 version of Sequelize, hasMany's use of through gives an error, and on the other hand through
    option for belongsToMany has been made required.
     * @see  https://github.com/sequelize/sequelize/blob/v3.4.1/lib/associations/has-many.js
     * @see  https://github.com/sequelize/sequelize/blob/v3.4.1/lib/associations/belongs-to-many.js
    */
    through: Class<Through> | string | ThroughOptions<Through>,

    /**
     * The name of the foreign key in the join table (representing the target model) or an object representing
     * the type definition for the other column (see `Sequelize.define` for syntax). When using an object, you
    can add a `name` property to set the name of the colum. Defaults to the name of target + primary key of
    target
    */
    otherKey?: string | AssociationForeignKeyOptions,

    /**
     * Should the join model have timestamps
     */
    timestamps?: boolean
  }



  /**
   * Used for a association table in n:m associations.
   * @see  AssociationOptionsBelongsToMany
   */
  declare export type ThroughOptions<TInstance: Model<any>> = {
    /**
     * The model used to join both sides of the N:M association.
     */
    model: Class<TInstance>,

    /**
     * A key/value set that will be used for association create and find defaults on the through model.
     * (Remember to add the attributes to the through model)
     */
    scope?: ?AssociationScope,

    /**
     * If true a unique key will be generated from the foreign keys used (might want to turn this off and create
     * specific unique keys when using scopes)

    Defaults to true
    */
    unique?: boolean
  }

  declare type AssociationType = 'HasMany' | 'BelongsTo' | 'HasOne' | 'BelongsToMany'

  declare export type Attribute = {
    /**
     * A string or a data type
     */
    type: DataTypeAbstract,

    allowNull?: boolean,

    values?: Array<any>,

    /**
     * If true, the column will get a unique constraint. If a string is provided, the column will be part of a
     * composite unique index. If multiple columns have the same string, they will be part of the same unique
    index
    */
    unique?: boolean | string | {
      name: string,
      msg: string
    },

    /**
     * Primary key flag
     */
    primaryKey?: boolean,

    /**
     * Is this field an auto increment field
     */
    autoIncrement?: boolean,

    /**
     * Comment for the database
     */
    comment?: string,

    /**
     * An object with reference configurations
     */
    references?: string | Model<any> | DefineAttributeColumnReferencesOptions,

    Model: Model<any>,
    _autoGenerated?: true,
    fieldName: string,
    field: string,
  }

  declare export class Association<Source: Model<any>, Target: Model<any>> {
    constructor(source: Class<Source>, target: Class<Target>, options?: AssociationOptions): this;
    static BelongsTo: typeof BelongsTo;
    static HasOne: typeof HasOne;
    static BelongsToMany: typeof BelongsToMany;
    static HasMany: typeof HasMany;
    source: Class<Source>;
    target: Class<Target>;
    sequelize: Sequelize;
    options: AssociationOptions;
    scope: ?AssociationScope;
    isSingleAssociation: boolean;
    isMultiAssociation: boolean;
    isSelfAssociation: boolean;
    as: string | {
      singular: string,
      plural: string
    };
    associationType: $Subtype<AssociationType>;
  }

  declare type ArrayOrElement<T> = T | Array<T>;

  declare class BelongsTo<Source: Model<any>, TargetAttributes: Object, TargetInitAttributes: Object, Target: Model<TargetAttributes, TargetInitAttributes>> extends Association<Source, Target> {
    associationType: 'BelongsTo';
    foreignKey: string;
    foreignKeyField: string;
    foreignKeyAttribute: Attribute;
    identifier: string;
    targetKey: string;
    targetKeyField: string;
    targetKeyAttribute: string;
    targetIdentifier: string;
    targetKeyIsPrimary: boolean;
    identifierField: string;
    get(instance: Source, options?: FindOptions<TargetAttributes>): Promise<Target>;
    get<PrimaryKey>(instances: Array<Source>, options?: FindOptions<TargetAttributes>): Promise<{[key: PrimaryKey]: Target}>;
    set<PrimaryKey>(sourceInstance: Source, targetInstance: PrimaryKey | Target, options?: InstanceSaveOptions<TargetAttributes>): Promise<void>;
    create(sourceInstance: Source, values: TargetInitAttributes, options?: CreateOptions<TargetAttributes>): Promise<Target>;
  }

  declare class HasOne<Source: Model<any>, TargetAttributes: Object, TargetInitAttributes: Object, Target: Model<TargetAttributes, TargetInitAttributes>> extends Association<Source, Target> {
    associationType: 'HasOne';
    foreignKey: string;
    foreignKeyField: string;
    foreignKeyAttribute: Attribute;
    identifier: string;
    sourceKey: string;
    sourceKeyField: string;
    sourceKeyAttribute: string;
    sourceKeyIsPrimary: boolean;
    sourceIdentifier: string;
    identifierField: string;
    get(instance: Source, options?: FindOptions<TargetAttributes>): Promise<Target>;
    get<PrimaryKey>(instances: Array<Source>, options?: FindOptions<TargetAttributes>): Promise<{[key: PrimaryKey]: Target}>;
    set<PrimaryKey>(sourceInstance: Source, targetInstance: PrimaryKey | Target, options?: InstanceSaveOptions<TargetAttributes>): Promise<void>;
    create(sourceInstance: Source, values: TargetInitAttributes, options?: CreateOptions<TargetAttributes>): Promise<Target>;
  }

  declare class HasMany<Source: Model<any>, TargetAttributes: Object, TargetInitAttributes: Object, Target: Model<TargetAttributes, TargetInitAttributes>> extends Association<Source, Target> {
    associationType: 'HasMany';
    foreignKey: string;
    foreignKeyField: string;
    foreignKeyAttribute: Attribute;
    sourceKey: string;
    sourceKeyField: string;
    sourceKeyAttribute: string;
    identifierField: string;
    get(instance: Source, options?: FindOptions<TargetAttributes>): Promise<Array<Target>>;
    get<PrimaryKey>(instances: Array<Source>, options?: FindOptions<TargetAttributes>): Promise<{[key: PrimaryKey]: Target}>;
    count(instance: Source, options?: FindOptions<TargetAttributes>): Promise<number>;
    has<PrimaryKey>(sourceInstance: Source, targetInstances: ArrayOrElement<PrimaryKey | Target>, options?: FindOptions<TargetAttributes>): Promise<boolean>;
    set<PrimaryKey>(sourceInstance: Source, targetInstances: ArrayOrElement<PrimaryKey | Target>, options?: FindOptions<TargetAttributes> & UpdateRelatedOptions<TargetAttributes>): Promise<Source>;
    add<PrimaryKey>(sourceInstance: Source, targetInstances: ArrayOrElement<PrimaryKey | Target>, options?: UpdateRelatedOptions<TargetAttributes>): Promise<Source>;
    remove<PrimaryKey>(sourceInstance: Source, targetInstances: ArrayOrElement<PrimaryKey | Target>, options?: UpdateRelatedOptions<TargetAttributes>): Promise<this>;
    create(sourceInstance: Source, values: TargetInitAttributes, options?: CreateOptions<TargetAttributes>): Promise<Target>;
  }

  declare class BelongsToMany<
    SourceAttributes: Object,
    SourceInitAttributes: Object,
    Source: Model<SourceAttributes, SourceInitAttributes>,
    TargetAttributes: Object,
    TargetInitAttributes: Object,
    Target: Model<TargetAttributes, TargetInitAttributes>,
    ThroughAttributes: Object,
    Through: Model<ThroughAttributes, any>
  > extends Association<Source, Target> {
    associationType: 'BelongsToMany';
    foreignKey: string;
    foreignKeyField: string;
    foreignKeyAttribute: Attribute;
    otherKey: string;
    otherKeyField: string;
    otherKeyAttribute: string;
    identifierField: string;
    foreignIdentifierField?: string;
    paired?: BelongsToMany<TargetAttributes, TargetInitAttributes, Target, SourceAttributes, SourceInitAttributes, Source, ThroughAttributes, Through>;
    through: ThroughOptions<Through>;
    throughModel: Class<Through>;
    get(instance: Source, options?: FindOptions<TargetAttributes>): Promise<Array<Target>>;
    count(instance: Source, options?: FindOptions<TargetAttributes>): Promise<number>;
    has<PrimaryKey>(sourceInstance: Source, targetInstances: ArrayOrElement<PrimaryKey | Target>, options?: FindOptions<TargetAttributes>): Promise<boolean>;
    set<PrimaryKey>(sourceInstance: Source, targetInstances: ArrayOrElement<PrimaryKey | Target>, options?: FindOptions<TargetAttributes> & UpdateRelatedOptions<TargetAttributes> & DestroyOptions): Promise<Array<any>>;
    add<PrimaryKey>(sourceInstance: Source, targetInstances: ArrayOrElement<PrimaryKey | Target>, options?: FindOptions<TargetAttributes> & UpdateRelatedOptions<TargetAttributes>): Promise<Array<any>>;
    remove<PrimaryKey>(sourceInstance: Source, targetInstances: ArrayOrElement<PrimaryKey | Target>, options?: DestroyOptions): Promise<void>;
    create(sourceInstance: Source, values: TargetInitAttributes, options?: CreateOptions<TargetAttributes>): Promise<Target>;
  }

  /**
   * Abstract DataType interface. Use this if you want to create an interface that has a value any of the
   * DataTypes that Sequelize supports.
   */
  declare export type DataTypeAbstract = {
    /**
     * Although this is not needed for the definitions itself, we want to make sure that DataTypeAbstract is not
     * something than can be evaluated to an empty object.
     */
    dialectTypes: string,
    toSql(): string,
  }

  declare type DataTypeAbstractString<T> = {
    /**
     * A variable length string. Default length 255
     */
    (options?: {
      length: number
    }): T,
    (length: number): T,

    /**
     * Property BINARY for the type
     */
    BINARY: T
  } & DataTypeAbstract


  declare type DataTypeString = {} & DataTypeAbstractString<DataTypeString>


  declare type DataTypeChar = {} & DataTypeAbstractString<DataTypeString>


  declare type DataTypeText = DataTypeAbstract & {
    /**
     * Length of the text field.
     *
    Available lengths: `tiny`, `medium`, `long`
    */
    (options?: {
      length: string
    }): DataTypeText,
    (length: string): DataTypeText
  }


  declare type DataTypeAbstractNumber<T> = DataTypeAbstract & {
    UNSIGNED: T,
    ZEROFILL: T
  }


  declare type DataTypeNumber = DataTypeAbstractNumber<DataTypeNumber> & {}


  declare type DataTypeInteger = DataTypeAbstractNumber<DataTypeInteger> & {
    /**
     * Length of the number field.
     */
    (options?: {
      length: number
    }): DataTypeInteger,
    (length: number): DataTypeInteger
  }


  declare type DataTypeBigInt = DataTypeAbstractNumber<DataTypeBigInt> & {
    /**
     * Length of the number field.
     */
    (options?: {
      length: number
    }): DataTypeBigInt,
    (length: number): DataTypeBigInt
  }


  declare type DataTypeFloat = DataTypeAbstractNumber<DataTypeFloat> & {
    /**
     * Length of the number field and decimals of the float
     */
    (options?: {
      length: number,
      decimals?: number
    }): DataTypeFloat,
    (length: number, decimals?: number): DataTypeFloat
  }


  declare type DataTypeReal = DataTypeAbstractNumber<DataTypeReal> & {
    /**
     * Length of the number field and decimals of the real
     */
    (options?: {
      length: number,
      decimals?: number
    }): DataTypeReal,
    (length: number, decimals?: number): DataTypeReal
  }


  declare type DataTypeDouble = DataTypeAbstractNumber<DataTypeDouble> & {
    /**
     * Length of the number field and decimals of the real
     */
    (options?: {
      length: number,
      decimals?: number
    }): DataTypeDouble,
    (length: number, decimals?: number): DataTypeDouble
  }


  declare type DataTypeDecimal = DataTypeAbstractNumber<DataTypeDecimal> & {
    /**
     * Precision and scale for the decimal number
     */
    (options?: {
      precision: number,
      scale?: number
    }): DataTypeDecimal,
    (precision: number, scale?: number): DataTypeDecimal
  }


  declare type DataTypeBoolean = DataTypeAbstract & {}


  declare type DataTypeTime = DataTypeAbstract & {}


  declare type DataTypeDate = DataTypeAbstract & {
    /**
     * Length of decimal places of time
     */
    (options?: {
      length?: number
    }): DataTypeDate,
    (length?: number): DataTypeDate
  }


  declare type DataTypeDateOnly = DataTypeAbstract & {}


  declare type DataTypeHStore = DataTypeAbstract & {}


  declare type DataTypeJSONType = DataTypeAbstract & {}


  declare type DataTypeJSONB = DataTypeAbstract & {}


  declare type DataTypeNow = DataTypeAbstract & {}


  declare type DataTypeBlob = DataTypeAbstract & {
    /**
     * Length of the blob field.
     *
    Available lengths: `tiny`, `medium`, `long`
    */
    (options?: {
      length: string
    }): DataTypeBlob,
    (length: string): DataTypeBlob
  }


  declare type DataTypeRange = DataTypeAbstract & {
    /**
     * Range field for Postgre
     *
    Accepts subtype any of the ranges
    */
    (options?: {
      subtype: DataTypeAbstract
    }): DataTypeRange,
    (subtype: DataTypeAbstract): DataTypeRange
  }


  declare type DataTypeUUID = DataTypeAbstract & {}


  declare type DataTypeUUIDv1 = DataTypeAbstract & {}


  declare type DataTypeUUIDv4 = DataTypeAbstract & {}

  declare class DataTypeVirtualClass {
    constructor(subtype: DataTypeAbstract, requireAttributes?: Array<string>): DataTypeVirtual;
  }

  declare type DataTypeVirtual = DataTypeAbstract & typeof DataTypeVirtualClass & {
    (subtype: DataTypeAbstract, requireAttributes?: Array<string>): DataTypeVirtual;
  }

  declare type DataTypeEnum = DataTypeAbstract & {
    /**
     * Enum field
     *
    Accepts values
    */
    (options?: {
      values: string | string[]
    }): DataTypeEnum,
    (values: string | string[]): DataTypeEnum,
    (...args: string[]): DataTypeEnum
  }


  declare type DataTypeArray = DataTypeAbstract & {
    /**
     * Array field for Postgre
     *
    Accepts type any of the DataTypes
    */
    (options: {
      type: DataTypeAbstract
    }): DataTypeArray,
    (type: DataTypeAbstract): DataTypeArray
  }


  declare type DataTypeGeometry = DataTypeAbstract & {
    /**
     * Geometry field for Postgres
     */
    (type: string, srid?: number): DataTypeGeometry
  }



  /**
   * A convenience class holding commonly used data types. The datatypes are used when definining a new model
   * using
  `Sequelize.define`, like this:

  ```js
  sequelize.define('model', {
  column: DataTypes.INTEGER
  })
  ```
  When defining a model you can just as easily pass a string as type, but often using the types defined here
  is
  beneficial. For example, using `DataTypes.BLOB`, mean that that column will be returned as an instance of
  `Buffer` when being fetched by sequelize.

  Some data types have special properties that can be accessed in order to change the data type.
  For example, to get an unsigned integer with zerofill you can do `DataTypes.INTEGER.UNSIGNED.ZEROFILL`.
  The order you access the properties in do not matter, so `DataTypes.INTEGER.ZEROFILL.UNSIGNED` is fine as
  well. The available properties are listed under each data type.

  To provide a length for the data type, you can invoke it like a function: `INTEGER(2)`

  Three of the values provided here (`NOW`, `UUIDV1` and `UUIDV4`) are special default values, that should not
  be used to define types. Instead they are used as shorthands for defining default values. For example, to
  get a uuid field with a default value generated following v1 of the UUID standard:

  ```js
  sequelize.define('model', {
  uuid: {
  type: DataTypes.UUID,
  defaultValue: DataTypes.UUIDV1,
  primaryKey: true
  }
  })
  ```
  */
  declare export type DataTypes = {
    ABSTRACT: DataTypeAbstract,
    STRING: DataTypeString,
    CHAR: DataTypeChar,
    TEXT: DataTypeText,
    NUMBER: DataTypeNumber,
    INTEGER: DataTypeInteger,
    BIGINT: DataTypeBigInt,
    FLOAT: DataTypeFloat,
    TIME: DataTypeTime,
    DATE: DataTypeDate,
    DATEONLY: DataTypeDateOnly,
    BOOLEAN: DataTypeBoolean,
    NOW: DataTypeNow,
    BLOB: DataTypeBlob,
    DECIMAL: DataTypeDecimal,
    NUMERIC: DataTypeDecimal,
    UUID: DataTypeUUID,
    UUIDV1: DataTypeUUIDv1,
    UUIDV4: DataTypeUUIDv4,
    HSTORE: DataTypeHStore,
    JSON: DataTypeJSONType,
    JSONB: DataTypeJSONB,
    VIRTUAL: DataTypeVirtual,
    ARRAY: DataTypeArray,
    NONE: DataTypeVirtual,
    ENUM: DataTypeEnum,
    RANGE: DataTypeRange,
    REAL: DataTypeReal,
    DOUBLE: DataTypeDouble,
    GEOMETRY: DataTypeGeometry,
  }


  /**
   * Abstract Deferrable interface. Use this if you want to create an interface that has a value any of the
   * Deferrables that Sequelize supports.
   */
  declare export type DeferrableAbstract = {
    /**
     * Although this is not needed for the definitions itself, we want to make sure that DeferrableAbstract is
     * not something than can be evaluated to an empty object.
     */
    toString(): string,
      toSql(): string
  }

  declare export type DeferrableInitiallyDeferred = {
    /**
     * A property that will defer constraints checks to the end of transactions.
     */
    (): DeferrableInitiallyDeferred
  } & DeferrableAbstract


  declare export type DeferrableInitiallyImmediate = {
    /**
     * A property that will trigger the constraint checks immediately
     */
    (): DeferrableInitiallyImmediate
  } & DeferrableAbstract


  declare export type DeferrableNot = {
    /**
     * A property that will set the constraints to not deferred. This is the default in PostgreSQL and it make
     * it impossible to dynamically defer the constraints within a transaction.
     */
    (): DeferrableNot
  } & DeferrableAbstract


  declare export type DeferrableSetDeferred = {
    /**
     * A property that will trigger an additional query at the beginning of a
     * transaction which sets the constraints to deferred.
     * @param constraints An array of constraint names. Will defer all constraints by default.
     */
    (constraints: string[]): DeferrableSetDeferred
  } & DeferrableAbstract


  declare export type DeferrableSetImmediate = {
    /**
     * A property that will trigger an additional query at the beginning of a
     * transaction which sets the constraints to immediately.
     * @param constraints An array of constraint names. Will defer all constraints by default.
     */
    (constraints: string[]): DeferrableSetImmediate
  } & DeferrableAbstract



  /**
   * A collection of properties related to deferrable constraints. It can be used to
   * make foreign key constraints deferrable and to set the constaints within a
  transaction. This is only supported in PostgreSQL.

  The foreign keys can be configured like this. It will create a foreign key
  that will check the constraints immediately when the data was inserted.

  ```js
  sequelize.define('Model', {
     foreign_id: {
     type: Sequelize.INTEGER,
     references: {
       model: OtherModel,
       key: 'id',
       deferrable: Sequelize.Deferrable.INITIALLY_IMMEDIATE
     }
     }
  });
  ```

  The constraints can be configured in a transaction like this. It will
  trigger a query once the transaction has been started and set the constraints
  to be checked at the very end of the transaction.

  ```js
  sequelize.transaction({
  deferrable: Sequelize.Deferrable.SET_DEFERRED
  });
  ```
  */
  declare export type Deferrable = {
    INITIALLY_DEFERRED: DeferrableInitiallyDeferred,
    INITIALLY_IMMEDIATE: DeferrableInitiallyImmediate,
    NOT: DeferrableNot,
    SET_DEFERRED: DeferrableSetDeferred,
    SET_IMMEDIATE: DeferrableSetImmediate
  }


  /**
   * The Base Error all Sequelize Errors inherit from.
   */
  declare export class BaseError extends Error {

  }

  declare export class ValidationError extends BaseError {
    /**
     * Validation Error. Thrown when the sequelize validation has failed. The error contains an `errors`
     * property, which is an array with 1 or more ValidationErrorItems, one for each validation that failed.
     * @param message Error message
     * @param errors Array of ValidationErrorItem objects describing the validation errors
     */
    constructor(
      message: string,
      errors?: ValidationErrorItem[]): ValidationError,

    /**
     * Gets all validation error items for the path / field specified.
     * @param path The path to be checked for error items
     */
    get(path: string): ValidationErrorItem[],

    /**
     * Array of ValidationErrorItem objects describing the validation errors
     */
    errors: ValidationErrorItem[]
  }


  declare export class ValidationErrorItem extends BaseError {
    /**
     * Validation Error Item
     * Instances of this class are included in the `ValidationError.errors` property.
     * @param message An error message
     * @param type The type of the validation error
     * @param path The field that triggered the validation error
     * @param value The value that generated the error
     */
    constructor(
      message: string,
      type: string,
      path: string,
      value: string): ValidationErrorItem,

    /**
     * An error message
     */
    message: string,

    /**
     * The type of the validation error
     */
    type: string,

    /**
     * The field that triggered the validation error
     */
    path: string,

    /**
     * The value that generated the error
     */
    value: string
  }


  declare export class DatabaseError extends BaseError {
    /**
     * A base class for all database related errors.
     */
    constructor(parent: Error): DatabaseError
  }


  declare export class TimeoutError extends DatabaseError {
    /**
     * Thrown when a database query times out because of a deadlock
     */
    constructor(parent: Error): TimeoutError
  }


  declare export class UniqueConstraintError extends ValidationError {
    /**
     * Thrown when a unique constraint is violated in the database
     */
    constructor(
      options: {
        parent?: Error,
        message?: string,
        errors?: Object
      }): UniqueConstraintError
  }


  declare export class ForeignKeyConstraintError extends DatabaseError {
    /**
     * Thrown when a foreign key constraint is violated in the database
     */
    construtor(
      options: {
        parent?: Error,
        message?: string,
        index?: string,
        fields?: string[],
        table?: string
      }): ForeignKeyConstraintError
  }


  declare export class ExclusionConstraintError extends DatabaseError {
    /**
     * Thrown when an exclusion constraint is violated in the database
     */
    construtor(
      options: {
        parent?: Error,
        message?: string,
        constraint?: string,
        fields?: string[],
        table?: string
      }): ExclusionConstraintError
  }


  declare export class ConnectionError extends BaseError {
    /**
     * A base class for all connection related errors.
     */
    construtor(parent: Error): ConnectionError
  }


  declare export class ConnectionRefusedError extends ConnectionError {
    /**
     * Thrown when a connection to a database is refused
     */
    construtor(parent: Error): ConnectionRefusedError
  }


  declare export class AccessDeniedError extends ConnectionError{
    /**
     * Thrown when a connection to a database is refused due to insufficient privileges
     */
    construtor(parent: Error): AccessDeniedError
  }


  declare export class HostNotFoundError extends ConnectionError {
    /**
     * Thrown when a connection to a database has a hostname that was not found
     */
    construtor(parent: Error): HostNotFoundError
  }


  declare export class HostNotReachableError extends ConnectionError {
    /**
     * Thrown when a connection to a database has a hostname that was not reachable
     */
    construtor(parent: Error): HostNotReachableError
  }


  declare export class InvalidConnectionError extends ConnectionError {
    /**
     * Thrown when a connection to a database has invalid values for any of the connection parameters
     */
    construtor(parent: Error): InvalidConnectionError
  }


  declare export class ConnectionTimedOutError extends ConnectionError {
    /**
     * Thrown when a connection to a database times out
     */
    construtor(parent: Error): ConnectionTimedOutError
  }


  declare export class EmptyResultError extends BaseError {
    /**
     * Thrown when a record was not found, Usually used with rejectOnEmpty mode (see message for details)
     */
    construtor(parent: Error): EmptyResultError
  }

  /**
   * Options for Sequelize.define. We mostly duplicate the Hooks here, since there is no way to combine the two
   * interfaces.

  beforeValidate, afterValidate, beforeBulkCreate, beforeBulkDestroy, beforeBulkUpdate, beforeCreate,
  beforeDestroy, beforeUpdate, afterCreate, afterDestroy, afterUpdate, afterBulkCreate, afterBulkDestroy and
  afterBulkUpdate.
  */
  declare export type HooksDefineOptions<TInstance: Model<any>> = {
    beforeValidate?: AsyncFn2<TInstance, Object>,
    validationFailed?: AsyncFn3<TInstance, Object, ValidationError>,
    afterValidate?: AsyncFn2<TInstance, Object>,
    beforeCreate?: AsyncFn2<TInstance, Object>,
    afterCreate?: AsyncFn2<TInstance, Object>,
    beforeDestroy?: AsyncFn2<TInstance, Object>,
    beforeDelete?: AsyncFn2<TInstance, Object>,
    afterDestroy?: AsyncFn2<TInstance, Object>,
    afterDelete?: AsyncFn2<TInstance, Object>,
    beforeUpdate?: AsyncFn2<TInstance, Object>,
    afterUpdate?: AsyncFn2<TInstance, Object>,
    beforeBulkCreate?: AsyncFn2<TInstance[], Object>,
    afterBulkCreate?: AsyncFn2<TInstance[], Object>,
    beforeBulkDestroy?: AsyncFn1<Object>,
    beforeBulkDelete?: AsyncFn1<Object>,
    afterBulkDestroy?: AsyncFn1<Object>,
    afterBulkDelete?: AsyncFn1<Object>,
    beforeBulkUpdate?: AsyncFn1<Object>,
    afterBulkUpdate?: AsyncFn1<Object>,
    beforeFind?: AsyncFn1<Object>,
    beforeFindAfterExpandIncludeAll?: AsyncFn1<Object>,
    beforeFindAfterOptions?: AsyncFn1<Object>,
    afterFind?: AsyncFn2<TInstance | TInstance[], Object>,
  }


  /**
   * Options used for Instance.increment method
   */
  declare export type InstanceIncrementDecrementOptions = {
    /**
     * The number to increment by
     * Defaults to 1
     */
    by?: number,

    /**
     * If true, the updatedAt timestamp will not be updated.
     */
    silent?: boolean,

    /**
     * A function that gets executed while running the query to log the sql.
     */
    logging?: boolean | Function,

    /**
     * Transaction to run query under
     */
    transaction?: ?Transaction,

    /**
     * An optional parameter to specify the schema search_path (Postgres only)
     */
    searchPath?: string,
  }


  /**
   * Options used for Instance.restore method
   */
  declare export type InstanceRestoreOptions = {
    /**
     * A function that gets executed while running the query to log the sql.
     */
    logging?: boolean | Function,

    /**
     * Transaction to run query under
     */
    transaction?: ?Transaction
  }


  /**
   * Options used for Instance.destroy method
   */
  declare export type InstanceDestroyOptions = {
    /**
     * If set to true, paranoid models will actually be deleted
     */
    force?: boolean,

    /**
     * A function that gets executed while running the query to log the sql.
     */
    logging?: boolean | Function,

    /**
     * Transaction to run the query in
     */
    transaction?: ?Transaction
  }


  /**
   * Options used for Instance.update method
   */
  declare export type InstanceUpdateOptions<TAttributes> = {
    /**
     * A hash of attributes to describe your search. See above for examples.
     */
    where?: WhereOptions,
  } & InstanceSaveOptions<TAttributes> & InstanceSetOptions



  /**
   * Options used for Instance.set method
   */
  declare export type InstanceSetOptions = {
    /**
     * If set to true, field and virtual setters will be ignored
     */
    raw?: boolean,

    /**
     * Clear all previously set data values
     */
    reset?: boolean
  }


  /**
   * Options used for Instance.save method
   */
  declare export type InstanceSaveOptions<TAttributes> = {
    /**
     * If true, the updatedAt timestamp will not be updated.
     *
    Defaults to false
    */
    silent?: boolean
  } & FieldsOptions<TAttributes> & LoggingOptions & ReturningOptions & SearchPathOptions

  declare export type LoggingOptions = {
    /**
     * A function that gets executed while running the query to log the sql.
     */
    logging?: boolean | Function,

    /**
     * Print query execution time in milliseconds when logging SQL.
     */
    benchmark?: boolean
  }

  declare export type SearchPathOptions = {
    /**
     * Transaction to run query under
     */
    transaction?: ?Transaction,

    /**
     * An optional parameter to specify the schema search_path (Postgres only)
     */
    searchPath?: string
  }

  declare export type ReturningOptions = {
    /**
     * Append RETURNING  to get back auto generated values (Postgres only)
     */
    returning?: boolean
  }

  declare export type FieldsOptions<TAttributes> = {
    /**
     * Run validations before the row is inserted
     */
    validate?: boolean,

    /**
     * The fields to insert / update. Defaults to all fields
     */
    fields?: $Keys<TAttributes>[]
  }


  /**
   * Options to pass to Model on drop
   */
  declare export type DropOptions = {
    /**
     * Also drop all objects depending on this table, such as views. Only works in postgres
     */
    cascade?: boolean
  } & LoggingOptions



  /**
   * Schema Options provided for applying a schema to a model
   */
  declare export type SchemaOptions = {
    /**
     * The character(s) that separates the schema name from the table name
     */
    schemaDelimeter?: string
  } & LoggingOptions



  /**
   * GetTableName Options
   */
  declare export type GetTableNameOptions = {} & LoggingOptions



  /**
   * AddScope Options for Model.addScope
   */
  declare export type AddScopeOptions = {
    /**
     * If a scope of the same name already exists, should it be overwritten?
     */
    override: boolean
  }


  /**
   * Scope Options for Model.scope
   */
  declare export type ScopeOptions = {
    /**
     * The scope(s) to apply. Scopes can either be passed as consecutive arguments, or as an array of arguments.
     * To apply simple scopes and scope functions with no arguments, pass them as strings. For scope function,
    pass an object, with a `method` property. The value can either be a string, if the method does not take
    any arguments, or an array, where the first element is the name of the method, and consecutive elements
    are arguments to that method. Pass null to remove all scopes, including the default.
    */
    method: string | any[],
  }

  /**
   * The type accepted by every `where` option
   *
   * The `Array<string | number>` is to support string with replacements, like `['id > ?', 25]`
   */
  declare export type WhereOptions = WhereAttributeHash | AndOperator | OrOperator | where | fn | $ReadOnlyArray<string | number | AndOperator | OrOperator>;

  /**
   * Example: `$any: [2,3]` becomes `ANY ARRAY[2, 3]::INTEGER`
   *
   * _PG only_
   */
  declare export type AnyOperator = {
    $any: $ReadOnlyArray<string | number>;
  }

  /** Undocumented? */
  declare export type AllOperator = {
    $all: $ReadOnlyArray<string | number>;
  }

  /**
   * Operators that can be used in WhereOptions
   *
   * See http://docs.sequelizejs.com/en/v3/docs/querying/#operators
   */
  declare export type WhereOperators = {

    /**
     * Example: `$any: [2,3]` becomes `ANY ARRAY[2, 3]::INTEGER`
     *
     * _PG only_
     */
    $any?: $ReadOnlyArray<string | number>;

    /** Example: `$gte: 6,` becomes `>= 6` */
    $gte?: number | string | Date;

    /** Example: `$lt: 10,` becomes `< 10` */
    $lt?: number | string | Date;

    /** Example: `$lte: 10,` becomes `<= 10` */
    $lte?: number | string | Date;

    /** Example: `$ne: 20,` becomes `!= 20` */
    $ne?: string | number | WhereOperators;

    /** Example: `$not: true,` becomes `IS NOT TRUE` */
    $not?: boolean | string | number | WhereOperators;

    /** Example: `$between: [6, 10],` becomes `BETWEEN 6 AND 10` */
    $between?: [number, number];

    /** Example: `$in: [1, 2],` becomes `IN [1, 2]` */
    $in?: $ReadOnlyArray<string | number> | literal;

    /** Example: `$notIn: [1, 2],` becomes `NOT IN [1, 2]` */
    $notIn?: $ReadOnlyArray<string | number> | literal;

    /**
     * Examples:
     *  - `$like: '%hat',` becomes `LIKE '%hat'`
     *  - `$like: { $any: ['cat', 'hat']}` becomes `LIKE ANY ARRAY['cat', 'hat']`
     */
    $like?: string | AnyOperator | AllOperator;

    /**
     * Examples:
     *  - `$notLike: '%hat'` becomes `NOT LIKE '%hat'`
     *  - `$notLike: { $any: ['cat', 'hat']}` becomes `NOT LIKE ANY ARRAY['cat', 'hat']`
     */
    $notLike?: string | AnyOperator | AllOperator;

    /**
     * case insensitive PG only
     *
     * Examples:
     *  - `$iLike: '%hat'` becomes `ILIKE '%hat'`
     *  - `$iLike: { $any: ['cat', 'hat']}` becomes `ILIKE ANY ARRAY['cat', 'hat']`
     */
    $ilike?: string | AnyOperator | AllOperator;

    /**
     * case insensitive PG only
     *
     * Examples:
     *  - `$iLike: '%hat'` becomes `ILIKE '%hat'`
     *  - `$iLike: { $any: ['cat', 'hat']}` becomes `ILIKE ANY ARRAY['cat', 'hat']`
     */
    $iLike?: string | AnyOperator | AllOperator;

    /**
     * PG array overlap operator
     *
     * Example: `$overlap: [1, 2]` becomes `&& [1, 2]`
     */
    $overlap?: [number, number];

    /**
     * PG array contains operator
     *
     * Example: `$contains: [1, 2]` becomes `@> [1, 2]`
     */
    $contains?: any[];

    /**
     * PG array contained by operator
     *
     * Example: `$contained: [1, 2]` becomes `<@ [1, 2]`
     */
    $contained?: any[];

    /** Example: `$gt: 6,` becomes `> 6` */
    $gt?: number | string | Date;

    /**
     * PG only
     *
     * Examples:
     *  - `$notILike: '%hat'` becomes `NOT ILIKE '%hat'`
     *  - `$notLike: ['cat', 'hat']` becomes `LIKE ANY ARRAY['cat', 'hat']`
     */
    $notILike?: string | AnyOperator | AllOperator;

    /** Example: `$notBetween: [11, 15],` becomes `NOT BETWEEN 11 AND 15` */
    $notBetween?: [number, number];
  } | {[op: Symbol]: any}

  /** Example: `$or: [{a: 5}, {a: 6}]` becomes `(a = 5 OR a = 6)` */
  declare export type OrOperator = {
    [$or: Symbol | '$or']: WhereOperators | WhereAttributeHash | $ReadOnlyArray<Array<string> | Array<number> | WhereOperators | WhereAttributeHash | where | AndOperator>;
  }

  /** Example: `$and: {a: 5}` becomes `AND (a = 5)` */
  declare export type AndOperator = {
    [$and: Symbol | '$and']: WhereOperators | WhereAttributeHash | $ReadOnlyArray<Array<string> | Array<number> | WhereOperators | WhereAttributeHash | where | OrOperator>;
  }

  /**
   * Where Geometry Options
   */
  declare export type WhereGeometryOptions = {
    type: string;
    coordinates: $ReadOnlyArray<Array<number> | number>;
  }

  /**
   * Used for the right hand side of WhereAttributeHash.
   * WhereAttributeHash is in there for JSON columns.
   */
  declare export type WhereValue =
    string // literal value
    | number // literal value
    | boolean // literal value
    | null
    | WhereOperators
    | WhereAttributeHash // for JSON columns
    | col // reference another column
    | OrOperator
    | AndOperator
    | WhereGeometryOptions
    | $ReadOnlyArray<string | number | WhereAttributeHash>; // implicit $or

  /**
   * A hash of attributes to describe your search.
   */
  declare export type WhereAttributeHash = {
    /**
     * Possible key values:
     * - A simple attribute name
     * - A nested key for JSON columns
     *
     *       {
   *         "meta.audio.length": {
   *           $gt: 20
   *         }
   *       }
     */
    [field: string]: WhereValue;
  }

  /**
   * Through options for Include Options
   */
  declare export type IncludeThroughOptions = {
    /**
     * Filter on the join model for belongsToMany relations
     */
    where?: WhereOptions,

    /**
     * A list of attributes to select from the join model for belongsToMany relations
     */
    attributes?: string[]
  }

  /**
   * Complex include options
   */
  declare export type IncludeOptions<TAttributes, TInstance: Model<TAttributes>> = {
    /**
     * The model you want to eagerly load
     */
    model?: Class<TInstance>,

    /**
     * The alias of the relation, in case the model you want to eagerly load is aliassed. For `hasOne` /
     * `belongsTo`, this should be the singular name, and for `hasMany`, it should be the plural
     */
    as?: string,

    /**
     * The association you want to eagerly load. (This can be used instead of providing a model/as pair)
     */
    association?: Association<any, TInstance>,

    /**
     * Where clauses to apply to the child models. Note that this converts the eager load to an inner join,
     * unless you explicitly set `required: false`
     */
    where?: WhereOptions,

    /**
     * A list of attributes to select from the child model
     */
    attributes?: FindOptionsAttributesArray<TAttributes> | {
      include?: FindOptionsAttributesArray<TAttributes>,
      exclude?: Array<$Keys<TAttributes>>
    },

    /**
     * If true, converts to an inner join, which means that the parent model will only be loaded if it has any
     * matching children. True if `include.where` is set, false otherwise.
     */
    required?: boolean,

    /**
     * Through Options
     */
    through?: IncludeThroughOptions,

    /**
     * Load further nested related models
     */
    include?: $ReadOnlyArray<Class<Model<any>> | IncludeOptions<any, any>>,

    /**
     * If true, only non-deleted records will be returned. If false, both deleted and non-deleted records will
     * be returned. Only applies if `options.paranoid` is true for the model.
     */
    paranoid?: boolean,
    all?: boolean | string
  }


  /**
   * Shortcut for types used in FindOptions.attributes
   */
  declare export type FindOptionsAttributesArray<TAttributes> = Array<
    $Keys<TAttributes> |
    literal |
    [fn, string] |
    [cast, string] |
    [literal, string] |
    [$Keys<TAttributes>, string] |
    fn |
    cast
  >;


  /**
   * Options that are passed to any model creating a SELECT query
   *
  A hash of options to describe the scope of the search
  */
  declare export type FindOptions<TAttributes>= {
    /**
     * A hash of attributes to describe your search. See above for examples.
     */
    where?: WhereOptions,

    /**
     * A list of the attributes that you want to select. To rename an attribute, you can pass an array, with
     * two elements - the first is the name of the attribute in the DB (or some kind of expression such as
    `Sequelize.literal`, `Sequelize.fn` and so on), and the second is the name you want the attribute to
    have in the returned instance
    */
    attributes?: FindOptionsAttributesArray<TAttributes> | {
      include?: FindOptionsAttributesArray<TAttributes>,
      exclude?: Array<$Keys<TAttributes>>
    },

    /**
     * If true, only non-deleted records will be returned. If false, both deleted and non-deleted records will
     * be returned. Only applies if `options.paranoid` is true for the model.
     */
    paranoid?: boolean,

    /**
     * A list of associations to eagerly load using a left join. Supported is either
     * `{ include: [ Model1, Model2, ...]}` or `{ include: [{ model: Model1, as: 'Alias' }]}`.
    If your association are set up with an `as` (eg. `X.hasMany(Y, { as: 'Z }`, you need to specify Z in
    the as attribute when eager loading Y).
    */
    include?: $ReadOnlyArray<Class<Model<any>> | IncludeOptions<any, any>>,

    /**
     * Specifies an ordering. If a string is provided, it will be escaped. Using an array, you can provide
     * several columns / functions to order by. Each element can be further wrapped in a two-element array. The
    first element is the column / function to order by, the second is the direction. For example:
    `order: [['name', 'DESC']]`. In this way the column will be escaped, but the direction will not.
    */
    order?:
      string |
      col |
      literal |
      $ReadOnlyArray<
        string |
        col |
        literal |
        Class<Model<any>> |
        {model: Class<Model<any>>, as?: string} |
        $ReadOnlyArray<
          string |
          number |
          Class<Model<any>> |
          {model: Class<Model<any>>, as?: string}
        >
      >,

    /**
     * Limit the results
     */
    limit?: number,

    /**
     * Skip the results;
     */
    offset?: number,

    /**
     * Lock the selected rows. Possible options are transaction.LOCK.UPDATE and transaction.LOCK.SHARE.
     * Postgres also supports transaction.LOCK.KEY_SHARE, transaction.LOCK.NO_KEY_UPDATE and specific model
    locks with joins. See [transaction.LOCK for an example](transaction#lock)
    */
    lock?: TransactionLockLevel | {
      level: TransactionLockLevel,
      of: Class<Model<any>>
    },

    /**
     * Return raw result. See sequelize.query for more information.
     */
    raw?: boolean,

    /**
     * having ?!?
     */
    having?: WhereOptions,

    /**
     * Group by. It is not mentioned in sequelize's JSDoc, but mentioned in docs.
     * https://github.com/sequelize/sequelize/blob/master/docs/docs/models-usage.md#user-content-manipulating-the-dataset-with-limit-offset-order-and-group
     */
    group?: string | string[] | Object,

    /**
     * Apply DISTINCT(col) for FindAndCount(all)
     */
    distinct?: boolean,

    /**
     * Prevents a subquery on the main table when using include
     */
    subQuery?: boolean,

    /**
     * Throw EmptyResultError if a record is not found
     */
    rejectOnEmpty?: boolean
  } & LoggingOptions & SearchPathOptions


  declare export type AnyFindOptions = FindOptions<any>;


  /**
   * Options for Model.count method
   */
  declare export type CountOptions = {
    /**
     * A hash of search attributes.
     */
    where?: WhereOptions,

    /**
     * Include options. See `find` for details
     */
    include?: $ReadOnlyArray<Class<Model<any>>| IncludeOptions<any, any>>,

    /**
     * Apply COUNT(DISTINCT(col))
     */
    distinct?: boolean,

    /**
     * Used in conjustion with `group`
     */
    attributes?: $ReadOnlyArray<string | [string, string]>,

    /**
     * For creating complex counts. Will return multiple rows as needed.
     *
    TODO: Check?
    */
    group?: Object | Array<string>,
  } & LoggingOptions & SearchPathOptions



  /**
   * Options for Model.build method
   */
  declare export type BuildOptions = {
    /**
     * If set to true, values will ignore field and virtual setters.
     */
    raw?: boolean,

    /**
     * Is this record new
     */
    isNewRecord?: boolean,

    /**
     * an array of include options - Used to build prefetched/included model instances. See `set`
     *
    TODO: See set
    */
    include?: $ReadOnlyArray<Class<Model<any>> | IncludeOptions<any, any>>
  } & ReturningOptions



  /**
   * Options for Model.create method
   */
  declare export type CreateOptions<TAttributes> = {
    /**
     * On Duplicate
     */
    onDuplicate?: string
  } & BuildOptions & InstanceSaveOptions<TAttributes>



  /**
   * Options for Model.findOrInitialize method
   */
  declare export type FindOrInitializeOptions<TAttributes>= {
    /**
     * Default values to use if building a new instance
     */
    defaults?: $Shape<TAttributes>
  } & FindOptions<TAttributes>



  /**
   * Options for Model.findOrInitialize method
   */
  declare export type FindCreateFindOptions<TAttributes>= {
    /**
     * Default values to use if building a new instance
     */
    defaults?: $Shape<TAttributes>
  } & FindOptions<TAttributes>



  /**
   * Options for Model.upsert method
   *
   */
  declare export type UpsertOptions<TAttributes> = {} & FieldsOptions<TAttributes> & LoggingOptions & SearchPathOptions



  /**
   * Options for Model.bulkCreate method
   */
  declare export type BulkCreateOptions<TAttributes> = {
    /**
     * Run before / after bulk create hooks?
     */
    hooks?: boolean,

    /**
     * Run before / after create hooks for each individual Instance? BulkCreate hooks will still be run if
     * options.hooks is true.
     */
    individualHooks?: boolean,

    /**
     * Ignore duplicate values for primary keys? (not supported by postgres)
     *
    Defaults to false
    */
    ignoreDuplicates?: boolean,

    /**
     * Fields to update if row key already exists (on duplicate key update)? (only supported by mysql &
     * mariadb). By default, all fields are updated.
     */
    updateOnDuplicate?: string[]
  } & FieldsOptions<TAttributes> & LoggingOptions & SearchPathOptions & ReturningOptions



  /**
   * The options passed to Model.destroy in addition to truncate
   */
  declare export type TruncateOptions = {
    /**
     * Only used in conjuction with TRUNCATE. Truncates  all tables that have foreign-key references to the
     * named table, or to any tables added to the group due to CASCADE.

    Defaults to false;
    */
    cascade?: boolean,

    /**
     * Delete instead of setting deletedAt to current timestamp (only applicable if paranoid is enabled)
     *
    Defaults to false;
    */
    force?: boolean
  } & LoggingOptions & SearchPathOptions



  /**
   * Options used for Model.destroy
   */
  declare export type DestroyOptions = {
    /**
     * Filter the destroy
     */
    where?: WhereOptions,

    /**
     * Run before / after bulk destroy hooks?
     */
    hooks?: boolean,

    /**
     * If set to true, destroy will SELECT all records matching the where parameter and will execute before /
     * after destroy hooks on each row
     */
    individualHooks?: boolean,

    /**
     * How many rows to delete
     */
    limit?: number,

    /**
     * Delete instead of setting deletedAt to current timestamp (only applicable if `paranoid` is enabled)
     */
    force?: boolean,

    /**
     * If set to true, dialects that support it will use TRUNCATE instead of DELETE FROM. If a table is
     * truncated the where and limit options are ignored
     */
    truncate?: boolean
  } & TruncateOptions

  declare type AsyncFn1<A> = (a: A, callback: (error?: Error) => any) => ?Promise<void>
  declare type AsyncFn2<A, B> = ((a: A, b: B, callback: (error?: Error) => any) => ?Promise<void>)
  declare type AsyncFn3<A, B, C> = ((a: A, b: B, c: C, callback: (error?: Error) => any) => ?Promise<void>)

  /**
   * Options for Model.restore
   */
  declare export type RestoreOptions = {
    /**
     * Filter the restore
     */
    where?: WhereOptions,

    /**
     * Run before / after bulk restore hooks?
     */
    hooks?: boolean,

    /**
     * If set to true, restore will find all records within the where parameter and will execute before / after
     * bulkRestore hooks on each row
     */
    individualHooks?: boolean,

    /**
     * How many rows to undelete
     */
    limit?: number,

    /**
     * Transaction to run query under
     */
    transaction?: ?Transaction
  } & LoggingOptions

  /**
   * Options used for HasMany.update, BelongsToMany.update
   */
  declare export type UpdateRelatedOptions<TAttributes> = {
    /**
     * Options to describe the scope of the search.
     */
    where?: WhereOptions,

    /**
     * Run before / after bulk update hooks?
     *
     Defaults to true
     */
    hooks?: boolean,

    /**
     * Whether or not to update the side effects of any virtual setters.
     *
     Defaults to true
     */
    sideEffects?: boolean,

    /**
     * Run before / after update hooks?. If true, this will execute a SELECT followed by individual UPDATEs.
     * A select is needed, because the row data needs to be passed to the hooks

     Defaults to false
     */
    individualHooks?: boolean,

    /**
     * How many rows to update (only for mysql and mariadb)
     */
    limit?: number,

    /**
     * Transaction to run query under
     */
    transaction?: ?Transaction,

    /**
     * If true, the updatedAt timestamp will not be updated.
     */
    silent?: boolean
  } & FieldsOptions<TAttributes> & LoggingOptions & ReturningOptions


  /**
   * Options used for Model.update
   */
  declare export type UpdateOptions<TAttributes> = {
    /**
     * Options to describe the scope of the search.
     */
    where: WhereOptions,

    /**
     * Run before / after bulk update hooks?
     *
    Defaults to true
    */
    hooks?: boolean,

    /**
     * Whether or not to update the side effects of any virtual setters.
     *
    Defaults to true
    */
    sideEffects?: boolean,

    /**
     * Run before / after update hooks?. If true, this will execute a SELECT followed by individual UPDATEs.
     * A select is needed, because the row data needs to be passed to the hooks

    Defaults to false
    */
    individualHooks?: boolean,

    /**
     * How many rows to update (only for mysql and mariadb)
     */
    limit?: number,

    /**
     * Transaction to run query under
     */
    transaction?: ?Transaction,

    /**
     * If true, the updatedAt timestamp will not be updated.
     */
    silent?: boolean
  } & FieldsOptions<TAttributes> & LoggingOptions & ReturningOptions



  /**
   * Options used for Model.aggregate
   */
  declare export type AggregateOptions = {
    /**
     * A hash of search attributes.
     */
    where?: WhereOptions,

    /**
     * The type of the result. If `field` is a field in this Model, the default will be the type of that field,
     * otherwise defaults to float.
     */
    dataType?: DataTypeAbstract | string,

    /**
     * Applies DISTINCT to the field being aggregated over
     */
    distinct?: boolean,

    /**
     * The transaction that the query should be executed under
     */
    transaction?: ?Transaction,

    /**
     * When `true`, the first returned value of `aggregateFunction` is cast to `dataType` and returned.
     * If additional attributes are specified, along with `group` clauses, set `plain` to `false` to return all values of all returned rows.
    Defaults to `true`
    */
    plain?: boolean
  } & LoggingOptions



  /**
   * A Model represents a table in the database. Sometimes you might also see it referred to as model, or simply
   * as factory. This class should _not_ be instantiated directly, it is created using `sequelize.define`, and
  already created models can be loaded using `sequelize.import`
  */
  declare export class Model<TAttributes, TInitAttributes = TAttributes, TPlainAttributes = TAttributes> {
    static init(attributes: DefineAttributes, options: DefineOptions<this>): this,

    static QueryInterface: QueryInterface,

    static QueryGenerator: any,

    static sequelize: Sequelize,

    sequelize: Sequelize,

    /**
     * The options this model was initialized with
     */
    static options: ResolvedDefineOptions<this>,

    /**
     * Remove attribute from model definition
     * @param attribute
     */
    static removeAttribute(attribute: string): void,

    /**
     * Sync this Model to the DB, that is create the table. Upon success, the callback will be called with the
     * model instance (this)
     */
    static sync(options?: SyncOptions): Promise<this>,

    /**
     * Drop the table represented by this Model
     * @param options
     */
    static drop(options?: DropOptions): Promise<void>,

    /**
     * Apply a schema to this model. For postgres, this will actually place the schema in front of the table
     * name
    - `"schema"."tableName"`, while the schema will be prepended to the table name for mysql and
    sqlite - `'schema.tablename'`.
     * @param schema The name of the schema
     * @param options
    */
    static schema(schema: string, options?: SchemaOptions): Class<this>,

    /**
     * Get the tablename of the model, taking schema into account. The method will return The name as a string
     * if the model has no schema, or an object with `tableName`, `schema` and `delimiter` properties.
     * @param options The hash of options from any query. You can use one model to access tables with matching
    schemas by overriding `getTableName` and using custom key/values to alter the name of the table.
    (eg.
    subscribers_1, subscribers_2)
     * @param options .logging=false A function that gets executed while running the query to log the sql.
    */
    static getTableName(options?: GetTableNameOptions): string | Object,

    /**
     * Add a new scope to the model. This is especially useful for adding scopes with includes, when the model you want to include is not available at the time this model is defined.
     *
    By default this will throw an error if a scope with that name already exists. Pass `override: true` in the options object to silence this error.
     * @param  The name of the scope. Use `defaultScope` to override the default scope
     * @param
     * @param  *
     * @param  .override=false]
    */
    static addScope(
      name: string,
      scope: AnyFindOptions | Function,
      options?: AddScopeOptions): void,

    /**
     * Apply a scope created in `define` to the model. First let's look at how to create scopes:
     * ```js
    var Model = sequelize.define('model', attributes, {
       defaultScope: {
       where: {
         username: 'dan'
       },
       limit: 12
       },
       scopes: {
       isALie: {
         where: {
         stuff: 'cake'
         }
       },
       complexFunction: function(email, accessLevel) {
         return {
         where: {
           email: {
           $like: email
           },
           accesss_level {
           $gte: accessLevel
           }
         }
         }
       }
       }
    })
    ```
    Now, since you defined a default scope, every time you do Model.find, the default scope is appended to
    your query. Here's a couple of examples:
    ```js
    Model.findAll() // WHERE username = 'dan'
    Model.findAll({ where: { age: { gt: 12 } } }) // WHERE age>12 AND username = 'dan'
    ```

    To invoke scope functions you can do:
    ```js
    Model.scope({ method: ['complexFunction' 'dan@sequelize.com', 42]}).findAll()
    // WHERE email like 'dan@sequelize.com%' AND access_level>= 42
    ```
     * @return  Model A reference to the model, with the scope(s) applied. Calling scope again on the returned
    model will clear the previous scope.
    */
    static scope(
      options?: string | ScopeOptions | $ReadOnlyArray<string | ScopeOptions>): Class<this>,

    /**
     * Search for multiple instances.
     *
    __Simple search using AND and =__
    ```js
    Model.findAll({
       where: {
       attr1: 42,
       attr2: 'cake'
       }
    })
    ```
    ```sql
    WHERE attr1 = 42 AND attr2 = 'cake'
    ```

    __Using greater than, less than etc.__
    ```js

    Model.findAll({
       where: {
       attr1: {
         gt: 50
       },
       attr2: {
         lte: 45
       },
       attr3: {
         in: [1,2,3]
       },
       attr4: {
         ne: 5
       }
       }
    })
    ```
    ```sql
    WHERE attr1>50 AND attr2 <= 45 AND attr3 IN (1,2,3) AND attr4 != 5
    ```
    Possible options are: `$ne, $in, $not, $notIn, $gte, $gt, $lte, $lt, $like, $ilike/$iLike, $notLike,
    $notILike, '..'/$between, '!..'/$notBetween, '&&'/$overlap, '@>'/$contains, '<@'/$contained`

    __Queries using OR__
    ```js
    Model.findAll({
       where: Sequelize.and(
       { name: 'a project' },
       Sequelize.or(
         { id: [1,2,3] },
         { id: { gt: 10 } }
       )
       )
    })
    ```
    ```sql
    WHERE name = 'a project' AND (id` IN (1,2,3) OR id>10)
    ```

    The success listener is called with an array of instances if the query succeeds.
     * @see  {Sequelize#query}
    */
    static findAll<TCustomAttributes>(
      options?: FindOptions<TAttributes & TCustomAttributes>): Promise<this[]>,
    static all<TCustomAttributes>(
      optionz?: FindOptions<TAttributes & TCustomAttributes>): Promise<this[]>,

    /**
     * Search for a single instance by its primary key. This applies LIMIT 1, so the listener will
     * always be called with a single instance.
     */
    static findById<TCustomAttributes>(
      identifier?: number | string,
      options?: FindOptions<TAttributes & TCustomAttributes>): Promise<?this>,
    static findByPrimary<TCustomAttributes>(
      identifier?: number | string,
      options?: FindOptions<TAttributes & TCustomAttributes>): Promise<?this>,

    /**
     * Search for a single instance. This applies LIMIT 1, so the listener will always be called with a single
     * instance.
     */
    static findOne<TCustomAttributes>(
      options?: FindOptions<TAttributes & TCustomAttributes>): Promise<?this>,
    static find<TCustomAttributes>(
      options?: FindOptions<TAttributes & TCustomAttributes>): Promise<?this>,

    /**
     * Run an aggregation method on the specified field
     * @param field The field to aggregate over. Can be a field name or *
     * @param aggregateFunction The function to use for aggregation, e.g. sum, max etc.
     * @param options Query options. See sequelize.query for full options
     * @return  Returns the aggregate result cast to `options.dataType`, unless `options.plain` is false, in
    which case the complete data result is returned.
    */
    static aggregate(
      field: string,
      aggregateFunction: string,
      options?: AggregateOptions): Promise<Object>,

    /**
     * Count the number of records matching the provided where clause.
     *
    If you provide an `include` option, the number of matching associations will be counted instead.
    */
    static count(options?: CountOptions): Promise<number>,

    /**
     * Find all the rows matching your query, within a specified offset / limit, and get the total number of
     * rows matching your query. This is very usefull for paging

    ```js
    Model.findAndCountAll({
       where: ...,
       limit: 12,
       offset: 12
    }).then(function (result) {
       ...
    })
    ```
    In the above example, `result.rows` will contain rows 13 through 24, while `result.count` will return
    the
    total number of rows that matched your query.

    When you add includes, only those which are required (either because they have a where clause, or
    because
    `required` is explicitly set to true on the include) will be added to the count part.

    Suppose you want to find all users who have a profile attached:
    ```js
    User.findAndCountAll({
       include: [
        { model: Profile, required: true}
       ],
       limit 3
    });
    ```
    Because the include for `Profile` has `required` set it will result in an inner join, and only the users
    who have a profile will be counted. If we remove `required` from the include, both users with and
    without
    profiles will be counted
    */
    static findAndCount<TCustomAttributes>(
      options?: FindOptions<TAttributes & TCustomAttributes>): Promise<{
      rows: this[],
      count: number
    }>,
    static findAndCountAll<TCustomAttributes>(
      options?: FindOptions<TAttributes & TCustomAttributes>): Promise<{
      rows: this[],
      count: number
    }>,

    /**
     * Find the maximum value of field
     */
    static max(field: string, options?: AggregateOptions): Promise<any>,

    /**
     * Find the minimum value of field
     */
    static min(field: string, options?: AggregateOptions): Promise<any>,

    /**
     * Find the sum of field
     */
    static sum(field: string, options?: AggregateOptions): Promise<number>,

    /**
     * Builds a new model instance. Values is an object of key value pairs, must be defined but can be empty.
     */
    static build(record?: TInitAttributes, options?: BuildOptions): this,

    /**
     * Undocumented bulkBuild
     */
    static bulkBuild(records: TInitAttributes[], options?: BuildOptions): this[],

    /**
     * Builds a new model instance and calls save on it.
     */
    static create(values?: TInitAttributes, options?: CreateOptions<TAttributes>): Promise<this>,

    /**
     * Find a row that matches the query, or build (but don't save) the row if none is found.
     * The successfull result of the promise will be (instance, initialized) - Make sure to use .spread()
     */
    static findOrInitialize(
      options: FindOrInitializeOptions<TInitAttributes>): Promise<[this, boolean]>,
    static findOrBuild(
      options: FindOrInitializeOptions<TInitAttributes>): Promise<[this, boolean]>,

    /**
     * Find a row that matches the query, or build and save the row if none is found
     * The successful result of the promise will be (instance, created) - Make sure to use .spread()

    If no transaction is passed in the `options` object, a new transaction will be created internally, to
    prevent the race condition where a matching row is created by another connection after the find but
    before the insert call. However, it is not always possible to handle this case in SQLite, specifically
    if one transaction inserts and another tries to select before the first one has comitted. In this case,
    an instance of sequelize.TimeoutError will be thrown instead. If a transaction is created, a savepoint
    will be created instead, and any unique constraint violation will be handled internally.
    */
    static findOrCreate(
      options: FindOrInitializeOptions<TInitAttributes>): Promise<[this, boolean]>,

    /**
     * A more performant findOrCreate that will not work under a transaction (at least not in postgres)
     * Will execute a find call, if empty then attempt to create, if unique constraint then attempt to find again
     */
    static findCreateFind<TCustomAttributes>(
      options: FindCreateFindOptions<TInitAttributes & TCustomAttributes>): Promise<[this, boolean]>,

    /**
     * Insert or update a single row. An update will be executed if a row which matches the supplied values on
     * either the primary key or a unique key is found. Note that the unique index must be defined in your
    sequelize model and not just in the table. Otherwise you may experience a unique constraint violation,
    because sequelize fails to identify the row that should be updated.

    *Implementation details:*

    * MySQL - Implemented as a single query `INSERT values ON DUPLICATE KEY UPDATE values`
    * PostgreSQL - Implemented as a temporary function with exception handling: INSERT EXCEPTION WHEN
       unique_constraint UPDATE
    * SQLite - Implemented as two queries `INSERT; UPDATE`. This means that the update is executed
    regardless
       of whether the row already existed or not

    *Note* that SQLite returns undefined for created, no matter if the row was created or updated. This is
    because SQLite always runs INSERT OR IGNORE + UPDATE, in a single query, so there is no way to know
    whether the row was inserted or not.
    */
    static upsert(values: TInitAttributes, options?: UpsertOptions<TAttributes>): Promise<boolean>,
    static insertOrUpdate(values: TInitAttributes, options?: UpsertOptions<TAttributes>): Promise<boolean>,

    /**
     * Create and insert multiple instances in bulk.
     *
    The success handler is passed an array of instances, but please notice that these may not completely
    represent the state of the rows in the DB. This is because MySQL and SQLite do not make it easy to
    obtain
    back automatically generated IDs and other default values in a way that can be mapped to multiple
    records. To obtain Instances for the newly created values, you will need to query for them again.
     * @param records List of objects (key/value pairs) to create instances from
    */
    static bulkCreate(
      records: TInitAttributes[],
      options?: BulkCreateOptions<TAttributes>): Promise<this[]>,

    /**
     * Truncate all instances of the model. This is a convenient method for Model.destroy({ truncate: true }).
     */
    static truncate(options?: TruncateOptions): Promise<void>,

    /**
     * Delete multiple instances, or set their deletedAt timestamp to the current time if `paranoid` is enabled.
     * @return  Promise<number> The number of destroyed rows
     */
    static destroy(options?: DestroyOptions): Promise<number>,

    /**
     * Restore multiple instances if `paranoid` is enabled.
     */
    static restore(options?: RestoreOptions): Promise<void>,

    /**
     * Update multiple instances that match the where options. The promise returns an array with one or two
     * elements. The first element is always the number of affected rows, while the second element is the actual
    affected rows (only supported in postgres with `options.returning` true.)
    */
    static update(
      values: $Shape<TAttributes>,
      options: UpdateOptions<TAttributes>): Promise<[number, this[]]>,

    /**
     * Run a describe query on the table. The result will be return to the listener as a hash of attributes and
     * their types.
     */
    static describe(): Promise<Object>,

    /**
     * Unscope the model
     */
    static unscoped(): Class<this>,

    /**
     * Add a hook to the model
     * @param hookType
     * @param name Provide a name for the hook function. It can be used to remove the hook later or to order
     hooks based on some sort of priority system in the future.
     * @param fn The hook function
     * @alias  hook
     */
    static addHook(hookType: string, name: string, fn: Function): Class<this>,
    static addHook(hookType: string, fn: Function): Class<this>,
    static hook(hookType: string, name: string, fn: Function): Class<this>,
    static hook(hookType: string, fn: Function): Class<this>,

    /**
     * Remove hook from the model
     * @param hookType
     * @param name
     */
    static removeHook(hookType: string, name: string): Class<this>,

    /**
     * Check whether the model has any hooks of this type
     * @param hookType
     * @alias  hasHooks
     */
    static hasHook(hookType: string): boolean,
    static hasHooks(hookType: string): boolean,

    /**
     * A hook that is run before validation
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    static beforeValidate(
      name: string,
      fn: AsyncFn2<this, Object>): void,
    static beforeValidate(fn: AsyncFn2<this, Object>): void,

    /**
     * A hook that is run after validation
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    static afterValidate(
      name: string,
      fn: AsyncFn2<this, Object>): void,
    static afterValidate(fn: AsyncFn2<this, Object>): void,

    /**
     * A hook that is run after validation
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    static validationFailed(
      name: string,
      fn: AsyncFn3<this, Object, ValidationError>): void,
    static validationFailed(fn: AsyncFn3<this, Object, ValidationError>): void,

    /**
     * A hook that is run before creating a single instance
     * @param name
     * @param fn A callback function that is called with attributes, options
     */
    static beforeCreate(
      name: string,
      fn: AsyncFn2<this, Object>): void,
    static beforeCreate(fn: AsyncFn2<this, Object>): void,

    /**
     * A hook that is run after creating a single instance
     * @param name
     * @param fn A callback function that is called with attributes, options
     */
    static afterCreate(
      name: string,
      fn: AsyncFn2<this, Object>): void,
    static afterCreate(fn: AsyncFn2<this, Object>): void,

    /**
     * A hook that is run before destroying a single instance
     * @param name
     * @param fn A callback function that is called with instance, options
     * @alias  beforeDelete
     */
    static beforeDestroy(
      name: string,
      fn: AsyncFn2<this, Object>): void,
    static beforeDestroy(fn: AsyncFn2<this, Object>): void,
    static beforeDelete(
      name: string,
      fn: AsyncFn2<this, Object>): void,
    static beforeDelete(fn: AsyncFn2<this, Object>): void,

    /**
     * A hook that is run after destroying a single instance
     * @param name
     * @param fn A callback function that is called with instance, options
     * @alias  afterDelete
     */
    static afterDestroy(
      name: string,
      fn: AsyncFn2<this, Object>): void,
    static afterDestroy(fn: AsyncFn2<this, Object>): void,
    static afterDelete(
      name: string,
      fn: AsyncFn2<this, Object>): void,
    static afterDelete(fn: AsyncFn2<this, Object>): void,

    /**
     * A hook that is run before updating a single instance
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    static beforeUpdate(
      name: string,
      fn: AsyncFn2<this, Object>): void,
    static beforeUpdate(fn: AsyncFn2<this, Object>): void,

    /**
     * A hook that is run after updating a single instance
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    static afterUpdate(
      name: string,
      fn: AsyncFn2<this, Object>): void,
    static afterUpdate(fn: AsyncFn2<this, Object>): void,

    /**
     * A hook that is run before upserting
     * @param name
     * @param fn A callback function that is called with attributes, options
     */
    static beforeUpsert(
      name: string,
      fn: AsyncFn2<TInitAttributes, Object>): void,
    static beforeUpsert(fn: AsyncFn2<TInitAttributes, Object>): void,

    /**
     * A hook that is run after upserting
     * @param name
     * @param fn A callback function that is called with result of upsert(), options
     */
    static afterUpsert(
      name: string,
      fn: AsyncFn2<boolean | [this, boolean], Object>): void,
    static afterUpsert(fn: AsyncFn2<boolean | [this, boolean], Object>): void,

    /**
     * A hook that is run before creating instances in bulk
     * @param name
     * @param fn A callback function that is called with instances, options
     */
    static beforeBulkCreate(
      name: string,
      fn: AsyncFn2<this[], Object>): void,
    static beforeBulkCreate(fn: AsyncFn2<this[], Object>): void,

    /**
     * A hook that is run after creating instances in bulk
     * @param name
     * @param fn A callback function that is called with instances, options
     * @name  afterBulkCreate
     */
    static afterBulkCreate(
      name: string,
      fn: AsyncFn2<this[], Object>): void,
    static afterBulkCreate(fn: AsyncFn2<this[], Object>): void,

    /**
     * A hook that is run before destroying instances in bulk
     * @param name
     * @param fn A callback function that is called with options
     * @alias  beforeBulkDelete
     */
    static beforeBulkDestroy(name: string, fn: AsyncFn1<Object>): void,
    static beforeBulkDestroy(fn: AsyncFn1<Object>): void,
    static beforeBulkDelete(name: string, fn: AsyncFn1<Object>): void,
    static beforeBulkDelete(fn: AsyncFn1<Object>): void,

    /* A hook that is run after destroying instances in bulk
     * @param name
     * @param fn A callback function that is called with options
     * @alias  afterBulkDelete
     */
    static afterBulkDestroy(name: string, fn: AsyncFn1<Object>): void,
    static afterBulkDestroy(fn: AsyncFn1<Object>): void,
    static afterBulkDelete(name: string, fn: AsyncFn1<Object>): void,
    static afterBulkDelete(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run after updating instances in bulk
     * @param name
     * @param fn A callback function that is called with options
     */
    static beforeBulkUpdate(name: string, fn: AsyncFn1<Object>): void,
    static beforeBulkUpdate(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run after updating instances in bulk
     * @param name
     * @param fn A callback function that is called with options
     */
    static afterBulkUpdate(name: string, fn: AsyncFn1<Object>): void,
    static afterBulkUpdate(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run before a find (select) query
     * @param name
     * @param fn A callback function that is called with options
     */
    static beforeFind(name: string, fn: AsyncFn1<Object>): void,
    static beforeFind(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run before a find (select) query, after any { include: {all: ...} } options are expanded
     * @param name
     * @param fn A callback function that is called with options
     */
    static beforeFindAfterExpandIncludeAll(name: string, fn: AsyncFn1<Object>): void,
    static beforeFindAfterExpandIncludeAll(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run before a find (select) query, after all option parsing is complete
     * @param name
     * @param fn A callback function that is called with options
     */
    static beforeFindAfterOptions(name: string, fn: AsyncFn1<Object>): void,
    static beforeFindAfterOptions(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run after a find (select) query
     * @param name
     * @param fn A callback function that is called with instance(s), options
     */
    static afterFind(
      name: string,
      AsyncFn2<this | this[], Object>): void,
    static afterFind(
      AsyncFn2<this | this[], Object>): void,

    /**
     * A hook that is run before a define call
     * @param name
     * @param fn A callback function that is called with attributes, options
     */
    static beforeDefine(
      name: string,
      fn: AsyncFn2<DefineAttributes, Object>): void,
    static beforeDefine(fn: AsyncFn2<DefineAttributes, Object>): void,

    /**
     * A hook that is run after a define call
     * @param name
     * @param fn A callback function that is called with factory
     */
    static afterDefine(name: string, fn: AsyncFn1<Model<this, any>>): void,
    static afterDefine(fn: AsyncFn1<Model<this, any>>): void,

    /**
     * A hook that is run before Sequelize() call
     * @param name
     * @param fn A callback function that is called with config, options
     */
    static beforeInit(name: string, fn: AsyncFn2<Object, Object>): void,
    static beforeInit(fn: AsyncFn2<Object, Object>): void,

    /**
     * A hook that is run after Sequelize() call
     * @param name
     * @param fn A callback function that is called with sequelize
     */
    static afterInit(name: string, fn: AsyncFn1<Sequelize>): void,
    static afterInit(fn: AsyncFn1<Sequelize>): void,

    /**
     * A hook that is run before Model.sync call
     * @param name
     * @param fn A callback function that is called with options passed to Model.sync
     */
    static beforeSync(name: string, fn: AsyncFn1<SyncOptions>): void,
    static beforeSync(fn: AsyncFn1<SyncOptions>): void,

    /**
     * A hook that is run after Model.sync call
     * @param name
     * @param fn A callback function that is called with options passed to Model.sync
     */
    static afterSync(name: string, fn: AsyncFn1<SyncOptions>): void,
    static afterSync(fn: AsyncFn1<SyncOptions>): void,

    /**
     * A hook that is run before sequelize.sync call
     * @param name
     * @param fn A callback function that is called with options passed to sequelize.sync
     */
    static beforeBulkSync(name: string, fn: AsyncFn1<SyncOptions>): void,
    static beforeBulkSync(fn: AsyncFn1<SyncOptions>): void,

    /**
     * A hook that is run after sequelize.sync call
     * @param name
     * @param fn A callback function that is called with options passed to sequelize.sync
     */
    static afterBulkSync(name: string, fn: AsyncFn1<SyncOptions>): void,
    static afterBulkSync(fn: AsyncFn1<SyncOptions>): void,

    /**
     * Creates an association between this (the source) and the provided target. The foreign key is added
     * on the target.

     Example: `User.hasOne(Profile)`. This will add userId to the profile table.
     * @param target The model that will be associated with hasOne relationship
     * @param options Options for the association
     */
    static hasOne<TargetAttributes: Object, TargetInitAttributes: Object, Target: Model<TargetAttributes, TargetInitAttributes>>(
      target: Class<Target>,
      options?: AssociationOptionsHasOne): HasOne<this, TargetAttributes, TargetInitAttributes, Target>,

    /**
     * Creates an association between this (the source) and the provided target. The foreign key is added on the
     * source.

     Example: `Profile.belongsTo(User)`. This will add userId to the profile table.
     * @param target The model that will be associated with hasOne relationship
     * @param options Options for the association
     */
    static belongsTo<TargetAttributes: Object, TargetInitAttributes: Object, Target: Model<TargetAttributes, TargetInitAttributes>>(
      target: Class<Target>,
      options?: AssociationOptionsBelongsTo): BelongsTo<this, TargetAttributes, TargetInitAttributes, Target>,

    /**
     * Create an association that is either 1:m or n:m.
     *
     ```js
     // Create a 1:m association between user and project
     User.hasMany(Project)
     ```
     ```js
     // Create a n:m association between user and project
     User.hasMany(Project)
     Project.hasMany(User)
     ```
     By default, the name of the join table will be source+target, so in this case projectsusers. This can be
     overridden by providing either a string or a Model as `through` in the options. If you use a through
     model with custom attributes, these attributes can be set when adding / setting new associations in two
     ways. Consider users and projects from before with a join table that stores whether the project has been
     started yet:
     ```js
     var UserProjects = sequelize.define('userprojects', {
         started: Sequelize.BOOLEAN
      })
     User.hasMany(Project, { through: UserProjects })
     Project.hasMany(User, { through: UserProjects })
     ```
     ```js
     jan.addProject(homework, { started: false }) // The homework project is not started yet
     jan.setProjects([makedinner, doshopping], { started: true}) // Both shopping and dinner have been
     started
     ```

     If you want to set several target instances, but with different attributes you have to set the
     attributes on the instance, using a property with the name of the through model:

     ```js
     p1.userprojects {
         started: true
      }
     user.setProjects([p1, p2], {started: false}) // The default value is false, but p1 overrides that.
     ```

     Similarily, when fetching through a join table with custom attributes, these attributes will be
     available as an object with the name of the through model.
     ```js
     user.getProjects().then(function (projects) {
         var p1 = projects[0]
         p1.userprojects.started // Is this project started yet?
      })
     ```
     * @param target The model that will be associated with hasOne relationship
     * @param options Options for the association
     */
    static hasMany<TargetAttributes: Object, TargetInitAttributes: Object, Target: Model<TargetAttributes, TargetInitAttributes>>(
      target: Class<Target>,
      options?: AssociationOptionsHasMany): HasMany<this, TargetAttributes, TargetInitAttributes, Target>,

    /**
     * Create an N:M association with a join table
     *
     ```js
     User.belongsToMany(Project)
     Project.belongsToMany(User)
     ```
     By default, the name of the join table will be source+target, so in this case projectsusers. This can be
     overridden by providing either a string or a Model as `through` in the options.

     If you use a through model with custom attributes, these attributes can be set when adding / setting new
     associations in two ways. Consider users and projects from before with a join table that stores whether
     the project has been started yet:
     ```js
     var UserProjects = sequelize.define('userprojects', {
         started: Sequelize.BOOLEAN
      })
     User.belongsToMany(Project, { through: UserProjects })
     Project.belongsToMany(User, { through: UserProjects })
     ```
     ```js
     jan.addProject(homework, { started: false }) // The homework project is not started yet
     jan.setProjects([makedinner, doshopping], { started: true}) // Both shopping and dinner has been started
     ```

     If you want to set several target instances, but with different attributes you have to set the
     attributes on the instance, using a property with the name of the through model:

     ```js
     p1.userprojects {
         started: true
      }
     user.setProjects([p1, p2], {started: false}) // The default value is false, but p1 overrides that.
     ```

     Similarily, when fetching through a join table with custom attributes, these attributes will be
     available as an object with the name of the through model.
     ```js
     user.getProjects().then(function (projects) {
         var p1 = projects[0]
         p1.userprojects.started // Is this project started yet?
      })
     ```
     * @param target The model that will be associated with hasOne relationship
     * @param options Options for the association
     */
    static belongsToMany<
      TargetAttributes: Object,
      TargetInitAttributes: Object,
      Target: Model<TargetAttributes, TargetInitAttributes>,
      ThroughAttributes: Object,
      Through: Model<ThroughAttributes, any>
    >(
      target: Class<Target>,
      options: AssociationOptionsBelongsToMany<Through>
    ): BelongsToMany<
      TAttributes, TInitAttributes, this,
      TargetAttributes, TargetInitAttributes, Target,
      ThroughAttributes, Through
    >,

    static getAssociations<Target: Model<any>>(model: Class<Target>): Array<Association<this, Target>>;
    static getAssociationForAlias<Target: Model<any>>(model: Class<Target>, alias: ?string): ?Association<this, Target>;

    static associations: {[name: string]: Association<this, any>},
    static tableName: string,
    static rawAttributes: {[name: string]: Attribute},
    static tableAttributes: {[name: string]: Attribute},
    static attributes: {[name: string]: Attribute},
    static primaryKeys: {[name: string]: Attribute},
    static primaryKeyAttributes: Array<string>,
    static primaryKeyAttribute: ?string,
    static primaryKeyField?: string,
    static uniqueKeys: {[idxName: string | false]: {
      name: string | false,
      column: string | false,
      msg: ?string,
      fields: Array<string>,
    }},
    static fieldRawAttributesMap: {[name: string]: string},
    static fieldAttributesMap: {[name: string]: string},

    Model: Class<this>,

    sequelize: Sequelize,

    /**
     * Returns true if this instance has not yet been persisted to the database
     */
    isNewRecord: boolean,

    /**
     * Get an object representing the query for this instance, use with `options.where`
     */
    where(): Object,

    /**
     * Get the value of the underlying data value
     */
    getDataValue(key: $Keys<TAttributes>): any,

    /**
     * Update the underlying data value
     */
    setDataValue(key: $Keys<TAttributes>, value: any): void,

    /**
     * If no key is given, returns all values of the instance, also invoking virtual getters.
     *
     If key is given and a field or virtual getter is present for the key it will call that getter - else it
     will return the value for key.
     * @param options .plain If set to true, included instances will be returned as plain objects
     */
    get(options: {plain: true, raw?: boolean, clone?: boolean}): TPlainAttributes,
    get(key: $Keys<TAttributes>, options?: {plain?: boolean, clone?: boolean, raw?: boolean}): any,
    get(options?: {plain?: boolean, clone?: boolean, raw?: boolean}): TAttributes,

    /**
     * Set is used to update values on the instance (the sequelize representation of the instance that is,
     * remember that nothing will be persisted before you actually call `save`). In its most basic form `set`
     will update a value stored in the underlying `dataValues` object. However, if a custom setter function
     is defined for the key, that function will be called instead. To bypass the setter, you can pass `raw:
     true` in the options object.

     If set is called with an object, it will loop over the object, and call set recursively for each key,
     value pair. If you set raw to true, the underlying dataValues will either be set directly to the object
     passed, or used to extend dataValues, if dataValues already contain values.

     When set is called, the previous value of the field is stored and sets a changed flag(see `changed`).

     Set can also be used to build instances for associations, if you have values for those.
     When using set with associations you need to make sure the property key matches the alias of the
     association while also making sure that the proper include options have been set (from .build() or
     .find())

     If called with a dot.seperated key on a JSON/JSONB attribute it will set the value nested and flag the
     entire object as changed.
     * @param options .raw If set to true, field and virtual setters will be ignored
     * @param options .reset Clear all previously set data values
     */
    set(key: $Keys<TAttributes>, value: any, options?: InstanceSetOptions): this,
    set(keys: $Shape<TAttributes>, options?: InstanceSetOptions): this,
    setAttributes(key: $Keys<TAttributes>, value: any, options?: InstanceSetOptions): this,
    setAttributes(keys: $Shape<TAttributes>, options?: InstanceSetOptions): this,

    /**
     * If changed is called with a string it will return a boolean indicating whether the value of that key in
     * `dataValues` is different from the value in `_previousDataValues`.

     If changed is called without an argument, it will return an array of keys that have changed.

     If changed is called without an argument and no keys have changed, it will return `false`.
     */
    changed(key: $Keys<TAttributes>): boolean,
    changed(): boolean | Array<$Keys<TAttributes>>,

    /**
     * Returns the previous value for key from `_previousDataValues`.
     */
    previous(key: $Keys<TAttributes>): any,

    /**
     * Validate this instance, and if the validation passes, persist it to the database.
     *
     On success, the callback will be called with this instance. On validation error, the callback will be
     called with an instance of `Sequelize.ValidationError`. This error will have a property for each of the
     fields for which validation failed, with the error message for that field.
     */
    save(options?: InstanceSaveOptions<TAttributes>): Promise<this>,

    /**
     * Refresh the current instance in-place, i.e. update the object with current data from the DB and return
     * the same object. This is different from doing a `find(Instance.id)`, because that would create and
     return a new instance. With this method, all references to the Instance are updated with the new data
     and no new objects are created.
     */
    reload(options?: AnyFindOptions): Promise<this>,

    /**
     * Validate the attribute of this instance according to validation rules set in the model definition.
     *
     Emits null if and only if validation successful; otherwise an Error instance containing
     { field name : [error msgs] } entries.
     * @param options .skip An array of strings. All properties that are in this array will not be validated
     */
    validate(options?: {
      skip?: $Keys<TAttributes>[]
    }): Promise<ValidationError>,

    /**
     * This is the same as calling `set` and then calling `save`.
     */
    update(
      key: $Keys<TAttributes>,
      value: any,
      options?: InstanceUpdateOptions<TAttributes>): Promise<this>,
    update(keys: $Shape<TAttributes>, options?: InstanceUpdateOptions<TAttributes>): Promise<this>,
    updateAttributes(
      key: $Keys<TAttributes>,
      value: any,
      options?: InstanceUpdateOptions<TAttributes>): Promise<this>,
    updateAttributes(keys: $Shape<TAttributes>, options?: InstanceUpdateOptions<TAttributes>): Promise<this>,

    /**
     * Destroy the row corresponding to this instance. Depending on your setting for paranoid, the row will
     * either be completely deleted, or have its deletedAt timestamp set to the current time.
     */
    destroy(options?: InstanceDestroyOptions): Promise<void>,

    /**
     * Restore the row corresponding to this instance. Only available for paranoid models.
     */
    restore(options?: InstanceRestoreOptions): Promise<void>,

    /**
     * Increment the value of one or more columns. This is done in the database, which means it does not use
     * the values currently stored on the Instance. The increment is done using a
     ```sql
     SET column = column + X
     ```
     query. To get the correct value after an increment into the Instance you should do a reload.

     ```js
     instance.increment('number') // increment number by 1
     instance.increment(['number', 'count'], { by: 2 }) // increment number and count by 2
     instance.increment({ answer: 42, tries: 1}, { by: 2 }) // increment answer by 42, and tries by 1.
     // `by` is ignored, since each column has its own
     // value
     ```
     * @param fields If a string is provided, that column is incremented by the value of `by` given in options.
     If an array is provided, the same is true for each column.
     If and object is provided, each column is incremented by the value given.
     */
    increment(
      fields: $Keys<TAttributes> | $Keys<TAttributes>[] | {[key: $Keys<TAttributes>]: number},
      options?: InstanceIncrementDecrementOptions): Promise<this>,

    /**
     * Decrement the value of one or more columns. This is done in the database, which means it does not use
     * the values currently stored on the Instance. The decrement is done using a
     ```sql
     SET column = column - X
     ```
     query. To get the correct value after an decrement into the Instance you should do a reload.

     ```js
     instance.decrement('number') // decrement number by 1
     instance.decrement(['number', 'count'], { by: 2 }) // decrement number and count by 2
     instance.decrement({ answer: 42, tries: 1}, { by: 2 }) // decrement answer by 42, and tries by 1.
     // `by` is ignored, since each column has its own
     // value
     ```
     * @param fields If a string is provided, that column is decremented by the value of `by` given in options.
     If an array is provided, the same is true for each column.
     If and object is provided, each column is decremented by the value given
     */
    decrement(
      fields: $Keys<TAttributes> | $Keys<TAttributes>[] | {[key: $Keys<TAttributes>]: number},
      options?: InstanceIncrementDecrementOptions): Promise<this>,

    /**
     * Check whether all values of this and `other` Instance are the same
     */
    equals(other: Model<any>): boolean,

    /**
     * Check if this is equal to one of `others` by calling equals
     */
    equalsOneOf(others: Model<any>[]): boolean,

    /**
     * Convert the instance to a JSON representation. Proxies to calling `get` with no keys. This means get all
     * values gotten from the DB, and apply all custom getters.
     */
    toJSON(): TPlainAttributes,
  }



  /**
   * Most of the methods accept options and use only the logger property of the options. That's why the most used
   * interface type for options in a method is separated here as another interface.
   */
  declare export type QueryInterfaceOptions = {
    /**
     * A function that gets executed while running the query to log the sql.
     */
    logging?: boolean | Function
  }

  declare export type AddUniqueConstraintOptions = {
    type: 'unique',
    name?: string
  }

  declare export type AddDefaultConstraintOptions = {
    type: 'default',
    name?: string,
    defaultValue?: any
  }

  declare export type AddCheckConstraintOptions = {
    type: 'check',
    name?: string,
    where?: WhereOptions
  }

  declare export type AddPrimaryKeyConstraintOptions = {
    type: 'primary key',
    name?: string
  }

  declare export type AddForeignKeyConstraintOptions = {
    type: 'foreign key',
    name?: string,
    references?: {
      table: string,
      field: string
    },
    onDelete: string,
    onUpdate: string
  }

  declare export type AddConstraintOptions =
    AddUniqueConstraintOptions |
    AddDefaultConstraintOptions |
    AddCheckConstraintOptions |
    AddPrimaryKeyConstraintOptions |
    AddForeignKeyConstraintOptions;


  /**
   * The interface that Sequelize uses to talk to all databases.
   *
  This interface is available through sequelize.QueryInterface. It should not be commonly used, but it's
  referenced anyway, so it can be used.
  */
  declare export interface QueryInterface {
    /**
     * Returns the dialect-specific sql generator.
     *
    We don't have a definition for the QueryGenerator, because I doubt it is commonly in use separately.
    */
    QueryGenerator: any,

    /**
     * Returns the current sequelize instance.
     */
    sequelize: Sequelize,

    /**
     * Queries the schema (table list).
     * @param schema The schema to query. Applies only to Postgres.
     */
    createSchema(schema?: string, options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Drops the specified schema (table).
     * @param schema The schema to query. Applies only to Postgres.
     */
    dropSchema(schema?: string, options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Drops all tables.
     */
    dropAllSchemas(options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Queries all table names in the database.
     * @param options
     */
    showAllSchemas(options?: QueryOptions): Promise<Object>,

    /**
     * Return database version
     */
    databaseVersion(options?: QueryInterfaceOptions): Promise<string>,

    /**
     * Creates a table with specified attributes.
     * @param tableName Name of table to create
     * @param attributes Hash of attributes, key is attribute name, value is data type
     * @param options Query options.
     */
    createTable(
      tableName: string | {
        schema?: string,
        tableName?: string
      },
      attributes: DefineAttributes,
      options?: QueryOptions): Promise<void>,

    /**
     * Drops the specified table.
     * @param tableName Table name.
     * @param options Query options, particularly "force".
     */
    dropTable(tableName: string, options?: QueryOptions): Promise<void>,

    /**
     * Drops all tables.
     * @param options
     */
    dropAllTables(options?: QueryOptions): Promise<void>,

    /**
     * Drops all defined enums
     * @param options
     */
    dropAllEnums(options?: QueryOptions): Promise<void>,

    /**
     * Renames a table
     */
    renameTable(
      before: string,
      after: string,
      options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Returns all tables
     */
    showAllTables(options?: QueryOptions): Promise<string[]>,

    /**
     * Describe a table
     */
    describeTable(
      tableName: string | {
        schema?: string,
        tableName?: string
      },
      options?: string | {
        schema?: string,
        schemaDelimeter?: string,
        logging?: boolean | Function
      }): Promise<Object>,

    /**
     * Adds a new column to a table
     */
    addColumn(
      table: string,
      key: string,
      attribute: DefineAttributeColumnOptions | DataTypeAbstract,
      options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Removes a column from a table
     */
    removeColumn(
      table: string,
      attribute: string,
      options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Changes a column
     */
    changeColumn(
      tableName: string | {
        schema?: string,
        tableName?: string
      },
      attributeName: string,
      dataTypeOrOptions?: string | DataTypeAbstract | DefineAttributeColumnOptions,
      options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Renames a column
     */
    renameColumn(
      tableName: string | {
        schema?: string,
        tableName?: string
      },
      attrNameBefore: string,
      attrNameAfter: string,
      options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Adds a new index to a table
     */
    addIndex(
      tableName: string | Object,
      options?: {
        fields: Array<string>,
        unique?: boolean,
        using?: string,
        type?: IndexType,
        name?: string,
        where?: WhereOptions<any>,
      }
    ): Promise<void>,

    /**
     * Shows the index of a table
     */
    showIndex(tableName: string | Object, options?: QueryOptions): Promise<Object>,

    /**
     * Put a name to an index
     */
    nameIndexes(indexes: string[], rawTablename: string): Promise<void>,

    /**
     * Returns all foreign key constraints of a table
     */
    getForeignKeysForTables(tableNames: string, options?: QueryInterfaceOptions): Promise<Object>,

    /**
     * Removes an index of a table
     */
    removeIndex(
      tableName: string,
      indexNameOrAttributes: string[] | string,
      options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Adds constraints to a table
     */
    addConstraint(
      tableName: string,
      attributes: string[],
      options?: AddConstraintOptions | QueryInterfaceOptions): Promise<void>,

    /**
     * Removes constraints from a table
     */
    removeConstraint(
      tableName: string,
      constraintName: string,
      options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Inserts a new record
     */
    insert(
      instance: Model<any>,
      tableName: string,
      values: Object,
      options?: QueryOptions): Promise<Object>,

    /**
     * Inserts or Updates a record in the database
     */
    upsert(
      tableName: string,
      values: Object,
      updateValues: Object,
      model: Class<Model<any>>,
      options?: QueryOptions): Promise<Object>,

    /**
     * Inserts multiple records at once
     */
    bulkInsert(
      tableName: string,
      records: Object[],
      options?: QueryOptions,
      attributes?: string[] | string): Promise<Object>,

    /**
     * Updates a row
     */
    update(
      instance: Model<any>,
      tableName: string,
      values: Object,
      identifier: Object,
      options?: QueryOptions): Promise<Object>,

    /**
     * Updates multiple rows at once
     */
    bulkUpdate(
      tableName: string,
      values: Object,
      identifier: Object,
      options?: QueryOptions,
      attributes?: string[] | string): Promise<Object>,

    /**
     * Deletes a row
     */
    delete(
      instance: Model<any>,
      tableName: string,
      identifier: Object,
      options?: QueryOptions): Promise<Object>,

    /**
     * Deletes multiple rows at once
     */
    bulkDelete(
      tableName: string,
      identifier: Object,
      options?: QueryOptions,
      model?: Class<Model<any>>): Promise<Object>,

    /**
     * Returns selected rows
     */
    select(
      model: Class<Model<any>>,
      tableName: string,
      options?: QueryOptions): Promise<Object[]>,

    /**
     * Increments a row value
     */
    increment(
      instance: Model<any>,
      tableName: string,
      values: Object,
      identifier: Object,
      options?: QueryOptions): Promise<Object>,

    /**
     * Selects raw without parsing the string into an object
     */
    rawSelect(
      tableName: string,
      options: QueryOptions,
      attributeSelector: string | string[],
      model?: Class<Model<any>>): Promise<string[]>,

    /**
     * Postgres only. Creates a trigger on specified table to call the specified function with supplied
     * parameters.
     */
    createTrigger(
      tableName: string,
      triggerName: string,
      timingType: string,
      fireOnArray: any[],
      functionName: string,
      functionParams: any[],
      optionsArray: string[],
      options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Postgres only. Drops the specified trigger.
     */
    dropTrigger(
      tableName: string,
      triggerName: string,
      options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Postgres only. Renames a trigger
     */
    renameTrigger(
      tableName: string,
      oldTriggerName: string,
      newTriggerName: string,
      options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Postgres only. Create a function
     */
    createFunction(
      functionName: string,
      params: any[],
      returnType: string,
      language: string,
      body: string,
      options?: QueryOptions): Promise<void>,

    /**
     * Postgres only. Drops a function
     */
    dropFunction(
      functionName: string,
      params: any[],
      options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Postgres only. Rename a function
     */
    renameFunction(
      oldFunctionName: string,
      params: any[],
      newFunctionName: string,
      options?: QueryInterfaceOptions): Promise<void>,

    /**
     * Escape an identifier (e.g. a table or attribute name). If force is true, the identifier will be quoted
     * even if the `quoteIdentifiers` option is false.
     */
    quoteIdentifier(identifier: string, force: boolean): string,

    /**
     * Escape a table name
     */
    quoteTable(identifier: string): string,

    /**
     * Split an identifier into .-separated tokens and quote each part. If force is true, the identifier will be
     * quoted even if the `quoteIdentifiers` option is false.
     */
    quoteIdentifiers(identifiers: string, force: boolean): string,

    /**
     * Escape a value (e.g. a string, number or date)
     */
    escape(value?: string | number | Date): string,

    /**
     * Set option for autocommit of a transaction
     */
    setAutocommit(
      transaction: Transaction,
      value: boolean,
      options?: QueryOptions): Promise<void>,

    /**
     * Set the isolation level of a transaction
     */
    setIsolationLevel(
      transaction: Transaction,
      value: string,
      options?: QueryOptions): Promise<void>,

    /**
     * Begin a new transaction
     */
    startTransaction(
      transaction: Transaction,
      options?: QueryOptions): Promise<void>,

    /**
     * Defer constraints
     */
    deferConstraints(
      transaction: Transaction,
      options?: QueryOptions): Promise<void>,

    /**
     * Commit an already started transaction
     */
    commitTransaction(
      transaction: Transaction,
      options?: QueryOptions): Promise<void>,

    /**
     * Rollback ( revert ) a transaction that has'nt been commited
     */
    rollbackTransaction(
      transaction: Transaction,
      options?: QueryOptions): Promise<void>
  }

  declare export type QueryTypes = {
    SELECT: string,
    INSERT: string,
    UPDATE: string,
    BULKUPDATE: string,
    BULKDELETE: string,
    DELETE: string,
    UPSERT: string,
    VERSION: string,
    SHOWTABLES: string,
    SHOWINDEXES: string,
    DESCRIBE: string,
    RAW: string,
    FOREIGNKEYS: string
  }


  /**
   * General column options
   * @see  Define
   * @see  AssociationForeignKeyOptions
   */
  declare export type ColumnOptions = {
    /**
     * If false, the column will have a NOT NULL constraint, and a not null validation will be run before an
     * instance is saved.
     */
    allowNull?: boolean,

    /**
     * If set, sequelize will map the attribute name to a different name in the database
     */
    field?: string,

    /**
     * A literal default value, a JavaScript function, or an SQL function (see `sequelize.fn`)
     */
    defaultValue?: any
  }


  /**
   * References options for the column's attributes
   * @see  AttributeColumnOptions
   */
  declare export type DefineAttributeColumnReferencesOptions = {
    /**
     * If this column references another table, provide it here as a Model, or a string
     */
    model: string | Class<Model<any>>,

    /**
     * The column of the foreign table that this column references
     */
    key?: string,

    /**
     * When to check for the foreign key constraing
     *
    PostgreSQL only
    */
    deferrable?: DeferrableInitiallyDeferred |
    DeferrableInitiallyImmediate |
    DeferrableNot |
    DeferrableSetDeferred |
    DeferrableSetImmediate
  }


  /**
   * Column options for the model schema attributes
   * @see  Attributes
   */
  declare export type DefineAttributeColumnOptions = {
    /**
     * A string or a data type
     */
    type: string | DataTypeAbstract,

    /**
     * If true, the column will get a unique constraint. If a string is provided, the column will be part of a
     * composite unique index. If multiple columns have the same string, they will be part of the same unique
    index
    */
    unique?: boolean | string | {
      name: string,
      msg: string
    },

    /**
     * Primary key flag
     */
    primaryKey?: boolean,

    /**
     * Is this field an auto increment field
     */
    autoIncrement?: boolean,

    /**
     * Comment for the database
     */
    comment?: string,

    /**
     * An object with reference configurations
     */
    references?: string | Model<any> | DefineAttributeColumnReferencesOptions,

    /**
     * What should happen when the referenced key is updated. One of CASCADE, RESTRICT, SET DEFAULT, SET NULL or
     * NO ACTION
     */
    onUpdate?: string,

    /**
     * What should happen when the referenced key is deleted. One of CASCADE, RESTRICT, SET DEFAULT, SET NULL or
     * NO ACTION
     */
    onDelete?: string,

    /**
     * Provide a custom getter for this column. Use `this.getDataValue(String)` to manipulate the underlying
     * values.
     */
    get?: () => any,

    /**
     * Provide a custom setter for this column. Use `this.setDataValue(String, Value)` to manipulate the
     * underlying values.
     */
    set?: (val: any) => void,

    /**
     * An object of validations to execute for this column every time the model is saved. Can be either the
     * name of a validation provided by validator.js, a validation function provided by extending validator.js
    (see the
    `DAOValidator` property for more details), or a custom validation function. Custom validation functions
    are called with the value of the field, and can possibly take a second callback argument, to signal that
    they are asynchronous. If the validator is sync, it should throw in the case of a failed validation, it
    it is async, the callback should be called with the error text.
    */
    validate?: DefineValidateOptions,

    /**
     * Usage in object notation
     *
    ```js
    sequelize.define('model', {
       states: {
         type:   Sequelize.ENUM,
         values: ['active', 'pending', 'deleted']
       }
       })
    ```
    */
    values?: string[]
  } & ColumnOptions



  /**
   * Interface for Attributes provided for a column
   * @see  Sequelize.define
   */
  declare export type DefineAttributes = {
    [name: string]: string | DataTypeAbstract | DefineAttributeColumnOptions
  }


  /**
   * Interface for query options
   * @see  Options
   */
  declare export type QueryOptions = {
    /**
     * If true, sequelize will not try to format the results of the query, or build an instance of a model from
     * the result
     */
    raw?: boolean,

    /**
     * The type of query you are executing. The query type affects how results are formatted before they are
     * passed back. The type is a string, but `Sequelize.QueryTypes` is provided as convenience shortcuts.
     */
    type?: string,

    /**
     * If true, transforms objects with `.` separated property names into nested objects using
     * [dottie.js](https://github.com/mickhansen/dottie.js). For example { 'user.username': 'john' } becomes
    { user: { username: 'john' }}. When `nest` is true, the query type is assumed to be `'SELECT'`,
    unless otherwise specified

    Defaults to false
    */
    nest?: boolean,

    /**
     * Sets the query type to `SELECT` and return a single row
     */
    plain?: boolean,

    /**
     * Either an object of named parameter replacements in the format `:param` or an array of unnamed
     * replacements to replace `?` in your SQL.
     */
    replacements?: Object | $ReadOnlyArray<string | number | boolean | Date>,

    /**
     * Either an object of named bind parameter in the format `$param` or an array of unnamed
     * bind parameter to replace `$1`, `$2`, ... in your SQL.
     */
    bind?: Object | $ReadOnlyArray<string | number | boolean | Date>,

    /**
     * Force the query to use the write pool, regardless of the query type.
     *
    Defaults to false
    */
    useMaster?: boolean,

    /**
     * A function that gets executed while running the query to log the sql.
     */
    logging?: boolean | Function,

    /**
     * A sequelize instance used to build the return instance
     */
    instance?: Model<any>,

    /**
     * A sequelize model used to build the returned model instances (used to be called callee)
     */
    model?: Class<Model<any,
    any>>,

    /**
     * Set of flags that control when a query is automatically retried.
     */
    retry?: RetryOptions,

    /**
     * If false do not prepend the query with the search_path (Postgres only)
     */
    supportsSearchPath?: boolean,

    /**
     * Map returned fields to model's fields if `options.model` or `options.instance` is present.
     * Mapping will occur before building the model instance.
     */
    mapToModel?: boolean,
    fieldMap?: {
      [key: string]: string
    }
  } & SearchPathOptions & ReturningOptions



  /**
   * Model validations, allow you to specify format/content/inheritance validations for each attribute of the
   * model.

  Validations are automatically run on create, update and save. You can also call validate() to manually
  validate an instance.

  The validations are implemented by validator.js.
  */
  declare export type DefineValidateOptions = {
    /**
     * is: ["^[a-z]+$",'i'] // will only allow letters
     * is: /^[a-z]+$/i    // same as the previous example using real RegExp
     */
    is?: string | $ReadOnlyArray<string | RegExp>| RegExp | {
      msg: string,
      args: string | $ReadOnlyArray<string | RegExp>| RegExp
    },

    /**
     * not: ["[a-z]",'i']  // will not allow letters
     */
    not?: string | $ReadOnlyArray<string | RegExp>| RegExp | {
      msg: string,
      args: string | $ReadOnlyArray<string | RegExp>| RegExp
    },

    /**
     * checks for email format (foo@bar.com)
     */
    isEmail?: boolean | {
      msg: string
    },

    /**
     * checks for url format (http://foo.com)
     */
    isUrl?: boolean | {
      msg: string
    },

    /**
     * checks for IPv4 (129.89.23.1) or IPv6 format
     */
    isIP?: boolean | {
      msg: string
    },

    /**
     * checks for IPv4 (129.89.23.1)
     */
    isIPv4?: boolean | {
      msg: string
    },

    /**
     * checks for IPv6 format
     */
    isIPv6?: boolean | {
      msg: string
    },

    /**
     * will only allow letters
     */
    isAlpha?: boolean | {
      msg: string
    },

    /**
     * will only allow alphanumeric characters, so "_abc" will fail
     */
    isAlphanumeric?: boolean | {
      msg: string
    },

    /**
     * will only allow numbers
     */
    isNumeric?: boolean | {
      msg: string
    },

    /**
     * checks for valid integers
     */
    isInt?: boolean | {
      msg: string
    },

    /**
     * checks for valid floating point numbers
     */
    isFloat?: boolean | {
      msg: string
    },

    /**
     * checks for any numbers
     */
    isDecimal?: boolean | {
      msg: string
    },

    /**
     * checks for lowercase
     */
    isLowercase?: boolean | {
      msg: string
    },

    /**
     * checks for uppercase
     */
    isUppercase?: boolean | {
      msg: string
    },

    /**
     * won't allow null
     */
    notNull?: boolean | {
      msg: string
    },

    /**
     * only allows null
     */
    isNull?: boolean | {
      msg: string
    },

    /**
     * don't allow empty strings
     */
    notEmpty?: boolean | {
      msg: string
    },

    /**
     * only allow a specific value
     */
    equals?: string | {
      msg: string
    },

    /**
     * force specific substrings
     */
    contains?: string | {
      msg: string
    },

    /**
     * check the value is not one of these
     */
    notIn?: string[][] | {
      msg: string,
      args: string[][]
    },

    /**
     * check the value is one of these
     */
    isIn?: string[][] | {
      msg: string,
      args: string[][]
    },

    /**
     * don't allow specific substrings
     */
    notContains?: string[] | string | {
      msg: string,
      args: string[] | string
    },

    /**
     * only allow values with length between 2 and 10
     */
    len?: [number, number] | {
      msg: string,
      args: [number, number]
    },

    /**
     * only allow uuids
     */
    isUUID?: 3 |
    4 |
    5 |
    'all' |
    {
      msg: string,
      args: number
    },

    /**
     * only allow date strings
     */
    isDate?: boolean | {
      msg: string,
      args: boolean
    },

    /**
     * only allow date strings after a specific date
     */
    isAfter?: string | {
      msg: string,
      args: string
    },

    /**
     * only allow date strings before a specific date
     */
    isBefore?: string | {
      msg: string,
      args: string
    },

    /**
     * only allow values
     */
    max?: number | {
      msg: string,
      args: number
    },

    /**
     * only allow values>= 23
     */
    min?: number | {
      msg: string,
      args: number
    },

    /**
     * only allow arrays
     */
    isArray?: boolean | {
      msg: string,
      args: boolean
    },

    /**
     * check for valid credit card numbers
     */
    isCreditCard?: boolean | {
      msg: string,
      args: boolean
    }, [name: string]: any
  }

  declare export type IndexType = 'UNIQUE' | 'FULLTEXT' | 'SPATIAL'

  declare export type DefineIndexOptions = {
    /**
     * The index type
     */
    indicesType?: IndexType,

    /**
     * The name of the index. Default is __
     */
    indexName?: string,

    /**
     * For FULLTEXT columns set your parser
     */
    parser?: string,

    /**
     * Set a type for the index, e.g. BTREE. See the documentation of the used dialect
     */
    indexType?: string,

    /**
     * A function that receives the sql query, e.g. console.log
     */
    logging?: Function,

    /**
     * A hash of attributes to limit your index(Filtered Indexes - MSSQL & PostgreSQL only)
     */
    where?: WhereOptions
  }

  declare export type IndexMethod = 'BTREE' | 'HASH' | 'GIST' | 'GIN'

  /**
   * Interface for indexes property in DefineOptions
   * @see  DefineOptions
   */
  declare export type DefineIndexesOptions = {
    /**
     * The name of the index. Defaults to model name + _ + fields concatenated
     */
    name?: string,

    /**
     * Index type. Only used by mysql. One of `UNIQUE`, `FULLTEXT` and `SPATIAL`
     */
    index?: IndexType,

    /**
     * The method to create the index by (`USING` statement in SQL). BTREE and HASH are supported by mysql and
     * postgres, and postgres additionally supports GIST and GIN.
     */
    method?: IndexMethod,

    /**
     * Should the index by unique? Can also be triggered by setting type to `UNIQUE`
     *
    Defaults to false
    */
    unique?: boolean,

    /**
     * PostgreSQL will build the index without taking any write locks. Postgres only
     *
    Defaults to false
    */
    concurrently?: boolean,

    /**
     * An array of the fields to index. Each field can either be a string containing the name of the field,
     * a sequelize object (e.g `sequelize.fn`), or an object with the following attributes: `attribute`
    (field name), `length` (create a prefix index of length chars), `order` (the direction the column
    should be sorted in), `collate` (the collation (sort order) for the column)
    */
    fields?: $ReadOnlyArray<string | fn | {
      attribute: string,
      length: number,
      order: string,
      collate: string
    }>,

    /**
     * Method the index should use, for example 'gin' index.
     */
    using?: string,

    /**
     * Operator that should be used by gin index, see Built-in GIN Operator Classes
     */
    operator?: string,

    /**
     * Condition for partioal index
     */
    where?: WhereOptions
  }


  /**
   * Interface for name property in DefineOptions
   * @see  DefineOptions
   */
  declare export type DefineNameOptions = {
    /**
     * Singular model name
     */
    singular?: string,

    /**
     * Plural model name
     */
    plural?: string
  }


  /**
   * Interface for getterMethods in DefineOptions
   * @see  DefineOptions
   */
  declare export type DefineGetterMethodsOptions = {
    [name: string]: () => any
  }


  /**
   * Interface for setterMethods in DefineOptions
   * @see  DefineOptions
   */
  declare export type DefineSetterMethodsOptions = {
    [name: string]: (val: any) => void
  }


  /**
   * Interface for Define Scope Options
   * @see  DefineOptions
   */
  declare export type DefineScopeOptions = {
    [scopeName: string]: AnyFindOptions | Function
  }


  /**
   * Options for model definition
   * @see  Sequelize.define
   */
  declare export type DefineOptions<TInstance: Model<any>> = {
    /**
     * Define the default search scope to use for this model. Scopes have the same form as the options passed to
     * find / findAll.
     */
    defaultScope?: AnyFindOptions,

    /**
     * More scopes, defined in the same way as defaultScope above. See `Model.scope` for more information about
     * how scopes are defined, and what you can do with them
     */
    scopes?: DefineScopeOptions,

    /**
     * Don't persits null values. This means that all columns with null values will not be saved.
     */
    omitNull?: boolean,

    /**
     * Adds createdAt and updatedAt timestamps to the model. Default true.
     */
    timestamps?: boolean,

    /**
     * Calling destroy will not delete the model, but instead set a deletedAt timestamp if this is true. Needs
     * timestamps=true to work. Default false.
     */
    paranoid?: boolean,

    /**
     * Converts all camelCased columns to underscored if true. Default false.
     */
    underscored?: boolean,

    /**
     * Converts camelCased model names to underscored tablenames if true. Default false.
     */
    underscoredAll?: boolean,

    /**
     * Indicates if the model's table has a trigger associated with it. Default false.
     */
    hasTrigger?: boolean,

    /**
     * If freezeTableName is true, sequelize will not try to alter the DAO name to get the table name.
     * Otherwise, the dao name will be pluralized. Default false.
     */
    freezeTableName?: boolean,

    /**
     * An object with two attributes, `singular` and `plural`, which are used when this model is associated to
     * others.
     */
    name?: DefineNameOptions,

    /**
     * Indexes for the provided database table
     */
    indexes?: DefineIndexesOptions[],

    /**
     * Override the name of the createdAt column if a string is provided, or disable it if false. Timestamps
     * must be true. Not affected by underscored setting.
     */
    createdAt?: string | boolean,

    /**
     * Override the name of the deletedAt column if a string is provided, or disable it if false. Timestamps
     * must be true. Not affected by underscored setting.
     */
    deletedAt?: string | boolean,

    /**
     * Override the name of the updatedAt column if a string is provided, or disable it if false. Timestamps
     * must be true. Not affected by underscored setting.
     */
    updatedAt?: string | boolean,

    /**
     * Defaults to pluralized model name, unless freezeTableName is true, in which case it uses model name
     * verbatim
     */
    tableName?: string,

    /**
     * Provide getter functions that work like those defined per column. If you provide a getter method with
     * the
    same name as a column, it will be used to access the value of that column. If you provide a name that
    does not match a column, this function will act as a virtual getter, that can fetch multiple other
    values
    */
    getterMethods?: DefineGetterMethodsOptions,

    /**
     * Provide setter functions that work like those defined per column. If you provide a setter method with
     * the
    same name as a column, it will be used to update the value of that column. If you provide a name that
    does not match a column, this function will act as a virtual setter, that can act on and set other
    values, but will not be persisted
    */
    setterMethods?: DefineSetterMethodsOptions,

    /**
     * Provide functions that are added to each instance (DAO). If you override methods provided by sequelize,
     * you can access the original method using `this.constructor.super_.prototype`, e.g.
    `this.constructor.super_.prototype.toJSON.apply(this, arguments)`
    */
    instanceMethods?: Object,

    /**
     * Provide functions that are added to the model (Model). If you override methods provided by sequelize,
     * you can access the original method using `this.constructor.prototype`, e.g.
    `this.constructor.prototype.find.apply(this, arguments)`
    */
    classMethods?: Object,
    schema?: string,

    /**
     * You can also change the database engine, e.g. to MyISAM. InnoDB is the default.
     */
    engine?: string,
    charset?: string,

    /**
     * Finaly you can specify a comment for the table in MySQL and PG
     */
    comment?: string,
    collate?: string,

    /**
     * Set the initial AUTO_INCREMENT value for the table in MySQL.
     */
    initialAutoIncrement?: string,

    /**
     * An object of hook function that are called before and after certain lifecycle events.
     * The possible hooks are: beforeValidate, afterValidate, beforeBulkCreate, beforeBulkDestroy,
    beforeBulkUpdate, beforeCreate, beforeDestroy, beforeUpdate, afterCreate, afterDestroy, afterUpdate,
    afterBulkCreate, afterBulkDestory and afterBulkUpdate. See Hooks for more information about hook
    functions and their signatures. Each property can either be a function, or an array of functions.
    */
    hooks?: HooksDefineOptions<TInstance>,

    /**
     * An object of model wide validations. Validations have access to all model values via `this`. If the
     * validator function takes an argument, it is asumed to be async, and is called with a callback that
    accepts an optional error.
    */
    validate?: DefineValidateOptions,

    /**
     * Enable optimistic locking.  When enabled, sequelize will add a version count attribute
     * to the model and throw an OptimisticLockingError error when stale instances are saved.
    Set to true or a string with the attribute name you want to use to enable.
    */
    version?: boolean | string
  }

  /**
   * @see  Model.options
   */
  declare export type ResolvedDefineOptions<TInstance: Model<any>> = {
    /**
     * Define the default search scope to use for this model. Scopes have the same form as the options passed to
     * find / findAll.
     */
    defaultScope: AnyFindOptions,

    /**
     * More scopes, defined in the same way as defaultScope above. See `Model.scope` for more information about
     * how scopes are defined, and what you can do with them
     */
    scopes: DefineScopeOptions,

    /**
     * Don't persits null values. This means that all columns with null values will not be saved.
     */
    omitNull: boolean,

    /**
     * Adds createdAt and updatedAt timestamps to the model. Default true.
     */
    timestamps: boolean,

    /**
     * Calling destroy will not delete the model, but instead set a deletedAt timestamp if this is true. Needs
     * timestamps=true to work. Default false.
     */
    paranoid: boolean,

    /**
     * Converts all camelCased columns to underscored if true. Default false.
     */
    underscored: boolean,

    /**
     * Converts camelCased model names to underscored tablenames if true. Default false.
     */
    underscoredAll: boolean,

    /**
     * Indicates if the model's table has a trigger associated with it. Default false.
     */
    hasTrigger?: boolean,

    /**
     * If freezeTableName is true, sequelize will not try to alter the DAO name to get the table name.
     * Otherwise, the dao name will be pluralized. Default false.
     */
    freezeTableName: boolean,

    /**
     * An object with two attributes, `singular` and `plural`, which are used when this model is associated to
     * others.
     */
    name: {
      singular: string,
      plural: string,
    },

    /**
     * Indexes for the provided database table
     */
    indexes: DefineIndexesOptions[],

    /**
     * Override the name of the createdAt column if a string is provided, or disable it if false. Timestamps
     * must be true. Not affected by underscored setting.
     */
    createdAt?: string | boolean,

    /**
     * Override the name of the deletedAt column if a string is provided, or disable it if false. Timestamps
     * must be true. Not affected by underscored setting.
     */
    deletedAt?: string | boolean,

    /**
     * Override the name of the updatedAt column if a string is provided, or disable it if false. Timestamps
     * must be true. Not affected by underscored setting.
     */
    updatedAt?: string | boolean,

    /**
     * Defaults to pluralized model name, unless freezeTableName is true, in which case it uses model name
     * verbatim
     */
    tableName?: string,

    /**
     * Provide getter functions that work like those defined per column. If you provide a getter method with
     * the
    same name as a column, it will be used to access the value of that column. If you provide a name that
    does not match a column, this function will act as a virtual getter, that can fetch multiple other
    values
    */
    getterMethods?: DefineGetterMethodsOptions,

    /**
     * Provide setter functions that work like those defined per column. If you provide a setter method with
     * the
    same name as a column, it will be used to update the value of that column. If you provide a name that
    does not match a column, this function will act as a virtual setter, that can act on and set other
    values, but will not be persisted
    */
    setterMethods?: DefineSetterMethodsOptions,

    /**
     * Provide functions that are added to each instance (DAO). If you override methods provided by sequelize,
     * you can access the original method using `this.constructor.super_.prototype`, e.g.
    `this.constructor.super_.prototype.toJSON.apply(this, arguments)`
    */
    instanceMethods?: Object,

    /**
     * Provide functions that are added to the model (Model). If you override methods provided by sequelize,
     * you can access the original method using `this.constructor.prototype`, e.g.
    `this.constructor.prototype.find.apply(this, arguments)`
    */
    classMethods?: Object,
    schema: ?string,
    schemaDelimeter: string,

    /**
     * You can also change the database engine, e.g. to MyISAM. InnoDB is the default.
     */
    engine?: string,
    charset?: string,

    /**
     * Finaly you can specify a comment for the table in MySQL and PG
     */
    comment?: string,
    collate?: string,

    /**
     * Set the initial AUTO_INCREMENT value for the table in MySQL.
     */
    initialAutoIncrement?: string,

    /**
     * An object of hook function that are called before and after certain lifecycle events.
     * The possible hooks are: beforeValidate, afterValidate, beforeBulkCreate, beforeBulkDestroy,
    beforeBulkUpdate, beforeCreate, beforeDestroy, beforeUpdate, afterCreate, afterDestroy, afterUpdate,
    afterBulkCreate, afterBulkDestory and afterBulkUpdate. See Hooks for more information about hook
    functions and their signatures. Each property can either be a function, or an array of functions.
    */
    hooks: HooksDefineOptions<TInstance>,

    /**
     * An object of model wide validations. Validations have access to all model values via `this`. If the
     * validator function takes an argument, it is asumed to be async, and is called with a callback that
    accepts an optional error.
    */
    validate: DefineValidateOptions,

    /**
     * Enable optimistic locking.  When enabled, sequelize will add a version count attribute
     * to the model and throw an OptimisticLockingError error when stale instances are saved.
    Set to true or a string with the attribute name you want to use to enable.
    */
    version?: boolean | string,

    sequelize: Sequelize,
  }


  /**
   * Sync Options
   * @see  Sequelize.sync
   */
  declare export type SyncOptions = {
    /**
     * If force is true, each DAO will do DROP TABLE IF EXISTS ..., before it tries to create its own table
     */
    force?: boolean,

    /**
     * Match a regex against the database name before syncing, a safety check for cases where force: true is
     * used in tests but not live code
     */
    match?: RegExp,

    /**
     * A function that logs sql queries, or false for no logging
     */
    logging?: Function | boolean,

    /**
     * The schema that the tables should be created in. This can be overriden for each table in sequelize.define
     */
    schema?: string,

    /**
     * Alters tables to fit models. Not recommended for production use. Deletes data in columns
     * that were removed or had their type changed in the model.
     */
    alter?: boolean,

    /**
     * If hooks is true then beforeSync, afterSync, beforBulkSync, afterBulkSync hooks will be called
     */
    hooks?: boolean,

    /**
     * An optional parameter to specify the schema search_path (Postgres only)
     */
    searchPath?: string
  }

  declare export type SetOptions = {}


  /**
   * Connection Pool options
   * @see  Options
   */
  declare export type PoolOptions = {
    /**
     * Maximum connections of the pool
     */
    max?: number,

    /**
     * Minimum connections of the pool
     */
    min?: number,

    /**
     * The maximum time, in milliseconds, that a connection can be idle before being released.
     */
    idle?: number,

    /**
     * The maximum time, in milliseconds, that pool will try to get connection before throwing error
     */
    acquire?: number,

    /**
     * A function that validates a connection. Called with client. The default function checks that client is an
     * object, and that its state is not disconnected.
     */
    validate?: (client?: any) => boolean,
    evict?: number
  }


  /**
   * Interface for replication Options in the sequelize constructor
   * @see  Options
   */
  declare export type ReplicationOptions = {
    read?: {
      host?: string,
      port?: string | number,
      username?: string,
      password?: string,
      database?: string
    },
    write?: {
      host?: string,
      port?: string | number,
      username?: string,
      password?: string,
      database?: string
    }
  }


  /**
   * Interface for retry Options in the sequelize constructor and QueryOptions
   * @see  Options, QueryOptions
   */
  declare export type RetryOptions = {
    /**
     * Only retry a query if the error matches one of these strings or Regexes.
     */
    match?: Array<string | RegExp>,

    /**
     * How many times a failing query is automatically retried. Set to 0 to disable retrying on SQL_BUSY error.
     */
    max?: number
  }


  /**
   * Operator symbols to be used when querying data
   */
  declare export type Operators = {
    eq: Symbol,
    ne: Symbol,
    gte: Symbol,
    gt: Symbol,
    lte: Symbol,
    lt: Symbol,
    not: Symbol,
    is: Symbol,
    in: Symbol,
    notIn: Symbol,
    like: Symbol,
    notLike: Symbol,
    iLike: Symbol,
    notILike: Symbol,
    regexp: Symbol,
    notRegexp: Symbol,
    iRegexp: Symbol,
    notIRegexp: Symbol,
    between: Symbol,
    notBetween: Symbol,
    overlap: Symbol,
    contains: Symbol,
    contained: Symbol,
    adjacent: Symbol,
    strictLeft: Symbol,
    strictRight: Symbol,
    noExtendRight: Symbol,
    noExtendLeft: Symbol,
    and: Symbol,
    or: Symbol,
    any: Symbol,
    all: Symbol,
    values: Symbol,
    col: Symbol,
    placeholder: Symbol,
    join: Symbol,
    raw: Symbol,
    Aliases: {
      '$eq': Symbol,
      '$ne': Symbol,
      '$gte': Symbol,
      '$gt': Symbol,
      '$lte': Symbol,
      '$lt': Symbol,
      '$not': Symbol,
      '$in': Symbol,
      '$notIn': Symbol,
      '$is': Symbol,
      '$like': Symbol,
      '$notLike': Symbol,
      '$iLike': Symbol,
      '$notILike': Symbol,
      '$regexp': Symbol,
      '$notRegexp': Symbol,
      '$iRegexp': Symbol,
      '$notIRegexp': Symbol,
      '$between': Symbol,
      '$notBetween': Symbol,
      '$overlap': Symbol,
      '$contains': Symbol,
      '$contained': Symbol,
      '$adjacent': Symbol,
      '$strictLeft': Symbol,
      '$strictRight': Symbol,
      '$noExtendRight': Symbol,
      '$noExtendLeft': Symbol,
      '$and': Symbol,
      '$or': Symbol,
      '$any': Symbol,
      '$all': Symbol,
      '$values': Symbol,
      '$col': Symbol,
      '$raw': Symbol,
    },
    LegacyAliases: {
      ne: Symbol,
      not: Symbol,
      in: Symbol,
      notIn: Symbol,
      gte: Symbol,
      gt: Symbol,
      lte: Symbol,
      lt: Symbol,
      like: Symbol,
      ilike: Symbol,
      '$ilike': Symbol,
      nlike: Symbol,
      '$notlike': Symbol,
      notilike: Symbol,
      '..': Symbol,
      between: Symbol,
      '!..': Symbol,
      notbetween: Symbol,
      nbetween: Symbol,
      overlap: Symbol,
      '&&': Symbol,
      '@>': Symbol,
      '<@': Symbol,
      '$eq': Symbol,
      '$ne': Symbol,
      '$gte': Symbol,
      '$gt': Symbol,
      '$lte': Symbol,
      '$lt': Symbol,
      '$not': Symbol,
      '$in': Symbol,
      '$notIn': Symbol,
      '$is': Symbol,
      '$like': Symbol,
      '$notLike': Symbol,
      '$iLike': Symbol,
      '$notILike': Symbol,
      '$regexp': Symbol,
      '$notRegexp': Symbol,
      '$iRegexp': Symbol,
      '$notIRegexp': Symbol,
      '$between': Symbol,
      '$notBetween': Symbol,
      '$overlap': Symbol,
      '$contains': Symbol,
      '$contained': Symbol,
      '$adjacent': Symbol,
      '$strictLeft': Symbol,
      '$strictRight': Symbol,
      '$noExtendRight': Symbol,
      '$noExtendLeft': Symbol,
      '$and': Symbol,
      '$or': Symbol,
      '$any': Symbol,
      '$all': Symbol,
      '$values': Symbol,
      '$col': Symbol,
      '$raw': Symbol,
    }
  }

  declare export type OperatorsAliases = {
    [key: string]: Symbol,
  }


  /**
   * Options for the constructor of Sequelize main class
   */
  declare export type Options = {
    /**
     * The dialect of the database you are connecting to. One of mysql, postgres, sqlite, mariadb and mssql.
     *
    Defaults to 'mysql'
    */
    dialect?: string,

    /**
     * If specified, load the dialect library from this path. For example, if you want to use pg.js instead of
     * pg when connecting to a pg database, you should specify 'pg.js' here
     */
    dialectModulePath?: string,

    /**
     * An object of additional options, which are passed directly to the connection library
     */
    dialectOptions?: Object,

    /**
     * Only used by sqlite.
     *
    Defaults to ':memory:'
    */
    storage?: string,

    /**
     * The host of the relational database.
     *
    Defaults to 'localhost'
    */
    host?: string,

    /**
     * The port of the relational database.
     */
    port?: number,

    /**
     * The protocol of the relational database.
     *
    Defaults to 'tcp'
    */
    protocol?: string,

    /**
     * The username which is used to authenticate against the database.
     */
    username?: string,

    /**
     * The password which is used to authenticate against the database.
     */
    password?: string,

    /**
     * The name of the database
     */
    database?: string,

    /**
     * Default options for model definitions. See sequelize.define for options
     */
    define?: DefineOptions<any>,

    /**
     * Default options for sequelize.query
     */
    query?: QueryOptions,

    /**
     * Default options for sequelize.set
     */
    set?: SetOptions,

    /**
     * Default options for sequelize.sync
     */
    sync?: SyncOptions,

    /**
     * The timezone used when converting a date from the database into a JavaScript date. The timezone is also
     * used to SET TIMEZONE when connecting to the server, to ensure that the result of NOW, CURRENT_TIMESTAMP
    and other time related functions have in the right timezone. For best cross platform performance use the
    format
    +/-HH:MM. Will also accept string versions of timezones used by moment.js (e.g. 'America/Los_Angeles');
    this is useful to capture daylight savings time changes.

    Defaults to '+00:00'
    */
    timezone?: string,

    /**
     * A function that gets executed everytime Sequelize would log something.
     *
    Defaults to console.log
    */
    logging?: boolean | Function,

    /**
     * A flag that defines if null values should be passed to SQL queries or not.
     *
    Defaults to false
    */
    omitNull?: boolean,

    /**
     * A flag that defines if native library shall be used or not. Currently only has an effect for postgres
     *
    Defaults to false
    */
    native?: boolean,

    /**
     * Use read / write replication. To enable replication, pass an object, with two properties, read and write.
     * Write should be an object (a single server for handling writes), and read an array of object (several
    servers to handle reads). Each read/write server can have the following properties: `host`, `port`,
    `username`, `password`, `database`

    Defaults to false
    */
    replication?: ReplicationOptions,

    /**
     * Set of flags that control when a query is automatically retried.
     */
    retry?: RetryOptions,

    /**
     * Run built in type validators on insert and update,
     * e.g. validate that arguments passed to integer fields are integer-like.

    Defaults to false
    */
    typeValidation?: boolean,

    /**
     * Connection pool options
     */
    pool?: PoolOptions,

    /**
     * Set to `false` to make table names and attributes case-insensitive on Postgres and skip double quoting of
     * them.

    Defaults to true
    */
    quoteIdentifiers?: boolean,

    /**
     * Set the default transaction isolation level. See `Sequelize.Transaction.ISOLATION_LEVELS` for possible
     * options.

    Defaults to 'REPEATABLE_READ'
    */
    isolationLevel?: TransactionIsolationLevel,

    /**
     * Set the default transaction type. See `Sequelize.Transaction.TYPES` for possible
     * options.

    Defaults to 'DEFERRED'
    */
    transactionType?: TransactionType,

    /**
     * Print query execution time in milliseconds when logging SQL.
     *
    Defaults to false
    */
    benchmark?: boolean,

    /**
     * String based operator alias, default value is true which will enable all operators alias.
     * Pass object to limit set of aliased operators or false to disable completely.
     */
    operatorsAliases?: boolean | OperatorsAliases
  }

  declare export type QueryOptionsTransactionRequired = {
    transaction: Transaction,
  }

  declare export type ModelsHashInterface = {
    [name: string]: Class<Model<any>>
  }


  /**
   * This is the main class, the entry point to sequelize. To use it, you just need to
   * import sequelize:

  ```js
  var Sequelize = require('sequelize');
  ```

  In addition to sequelize, the connection library for the dialect you want to use
  should also be installed in your project. You don't need to import it however, as
  sequelize will take care of that.
  */
  declare export default class Sequelize {
    constructor(database: string, username?: ?string, password?: ?string, options?: Options): Sequelize;
    constructor(database: string, options?: Options): Sequelize;
    constructor(options: Options): Sequelize;

    /**
     * A modified version of bluebird promises, that allows listening for sql events
     */
    static Promise: typeof Promise,
    Promise: typeof Promise,

    /**
     * Available query types for use with `sequelize.query`
     */
    static QueryTypes: QueryTypes,
    QueryTypes: QueryTypes,

    /**
     * Exposes the validator.js object, so you can extend it with custom validation functions.
     * The validator is exposed both on the instance, and on the constructor.
     */
    static Validator: Validator,
    Validator: Validator,

    /**
     * A Model represents a table in the database. Sometimes you might also see it referred to as model, or
     * simply as factory. This class should not be instantiated directly, it is created using sequelize.define,
     and already created models can be loaded using sequelize.import
     */
    static Model: typeof Model,
    Model: typeof Model,

    /**
     * A reference to the sequelize transaction class. Use this to access isolationLevels when creating a
     * transaction
     */
    static Transaction: typeof Transaction,
    Transaction: typeof Transaction,

    /**
     * A reference to the deferrable collection. Use this to access the different deferrable options.
     */
    static Deferrable: Deferrable,
    Deferrable: Deferrable,

    /**
     * A reference to the sequelize instance class.
     */
    static Op: Operators,
    Op: Operators,

    /**
     * Creates a object representing a database function. This can be used in search queries, both in where and
     * order parts, and as default values in column definitions. If you want to refer to columns in your
     function, you should use `sequelize.col`, so that the columns are properly interpreted as columns and
     not a strings.

     Convert a user's username to upper case
     ```js
     instance.updateAttributes({
       username: self.sequelize.fn('upper', self.sequelize.col('username'))
    })
     ```
     * @param fn The function you want to call
     * @param args All further arguments will be passed as arguments to the function
     */
    static fn(fn: string, ...args: any[]): fn,
    fn(fn: string, ...args: any[]): fn,

    /**
     * Creates a object representing a column in the DB. This is often useful in conjunction with
     * `sequelize.fn`, since raw string arguments to fn will be escaped.
     * @param col The name of the column
     */
    static col(col: string): col,
    col(col: string): col,

    /**
     * Creates a object representing a call to the cast function.
     * @param val The value to cast
     * @param type The type to cast it to
     */
    static cast(val: any, type: string): cast,
    cast(val: any, type: string): cast,

    /**
     * Creates a object representing a literal, i.e. something that will not be escaped.
     * @param val
     */
    static literal(val: any): literal,
    literal(val: any): literal,
    static asIs(val: any): literal,
    asIs(val: any): literal,

    /**
     * An AND query
     * @param args Each argument will be joined by AND
     */
    static and(...args: $ReadOnlyArray<string | Object>): AndOperator,
    and(...args: $ReadOnlyArray<string | Object>): AndOperator,

    /**
     * An OR query
     * @param args Each argument will be joined by OR
     */
    static or(...args: $ReadOnlyArray<string | Object>): OrOperator,
    or(...args: $ReadOnlyArray<string | Object>): OrOperator,

    /**
     * Creates an object representing nested where conditions for postgres's json data-type.
     * @param conditionsOrPath A hash containing strings/numbers or other nested hash, a string using dot
     notation or a string using postgres json syntax.
     * @param value An optional value to compare against. Produces a string of the form "<json path> =
     '<value>'".
     */
    static json(
      conditionsOrPath: string | Object,
      value?: string | number | boolean): json,
    json(
      conditionsOrPath: string | Object,
      value?: string | number | boolean): json,

    /**
     * A way of specifying attr = condition.
     *
     The attr can either be an object taken from `Model.rawAttributes` (for example `Model.rawAttributes.id`
     or
     `Model.rawAttributes.name`). The attribute should be defined in your model definition. The attribute can
     also be an object from one of the sequelize utility functions (`sequelize.fn`, `sequelize.col` etc.)

     For string attributes, use the regular `{ where: { attr: something }}` syntax. If you don't want your
     string to be escaped, use `sequelize.literal`.
     * @param attr The attribute, which can be either an attribute object from `Model.rawAttributes` or a
     sequelize object, for example an instance of `sequelize.fn`. For simple string attributes, use the
     POJO syntax
     * @param comparator Comparator
     * @param logic The condition. Can be both a simply type, or a further condition (`.or`, `.and`, `.literal`
     etc.)
     */
    static where(attr: Object, comparator: string, logic: string | Object): where,
    where(attr: Object, comparator: string, logic: string | Object): where,
    static where(attr: Object, logic: string | Object): where,
    where(attr: Object, logic: string | Object): where,
    static condition(attr: Object, comparator: string, logic: string | Object): where,
    condition(attr: Object, comparator: string, logic: string | Object): where,
    static condition(attr: Object, logic: string | Object): where,
    condition(attr: Object, logic: string | Object): where,

    static Error: typeof BaseError,
    static ValidationError: typeof ValidationError,
    static ValidationErrorItem: typeof ValidationErrorItem,
    static DatabaseError: typeof DatabaseError,
    static TimeoutError: typeof TimeoutError,
    static UniqueConstraintError: typeof UniqueConstraintError,
    static ExclusionConstraintError: typeof ExclusionConstraintError,
    static ForeignKeyConstraintError: typeof ForeignKeyConstraintError,
    static ConnectionError: typeof ConnectionError,
    static ConnectionRefusedError: typeof ConnectionRefusedError,
    static AccessDeniedError: typeof AccessDeniedError,
    static HostNotFoundError: typeof HostNotFoundError,
    static HostNotReachableError: typeof HostNotReachableError,
    static InvalidConnectionError: typeof InvalidConnectionError,
    static ConnectionTimedOutError: typeof ConnectionTimedOutError,
    static EmptyResultError: typeof EmptyResultError,

    Error: typeof BaseError,
    ValidationError: typeof ValidationError,
    ValidationErrorItem: typeof ValidationErrorItem,
    DatabaseError: typeof DatabaseError,
    TimeoutError: typeof TimeoutError,
    UniqueConstraintError: typeof UniqueConstraintError,
    ExclusionConstraintError: typeof ExclusionConstraintError,
    ForeignKeyConstraintError: typeof ForeignKeyConstraintError,
    ConnectionError: typeof ConnectionError,
    ConnectionRefusedError: typeof ConnectionRefusedError,
    AccessDeniedError: typeof AccessDeniedError,
    HostNotFoundError: typeof HostNotFoundError,
    HostNotReachableError: typeof HostNotReachableError,
    InvalidConnectionError: typeof InvalidConnectionError,
    ConnectionTimedOutError: typeof ConnectionTimedOutError,
    EmptyResultError: typeof EmptyResultError,

    static ABSTRACT: DataTypeAbstract,
    static STRING: DataTypeString,
    static CHAR: DataTypeChar,
    static TEXT: DataTypeText,
    static NUMBER: DataTypeNumber,
    static INTEGER: DataTypeInteger,
    static BIGINT: DataTypeBigInt,
    static FLOAT: DataTypeFloat,
    static TIME: DataTypeTime,
    static DATE: DataTypeDate,
    static DATEONLY: DataTypeDateOnly,
    static BOOLEAN: DataTypeBoolean,
    static NOW: DataTypeNow,
    static BLOB: DataTypeBlob,
    static DECIMAL: DataTypeDecimal,
    static NUMERIC: DataTypeDecimal,
    static UUID: DataTypeUUID,
    static UUIDV1: DataTypeUUIDv1,
    static UUIDV4: DataTypeUUIDv4,
    static HSTORE: DataTypeHStore,
    static JSON: DataTypeJSONType,
    static JSONB: DataTypeJSONB,
    static VIRTUAL: DataTypeVirtual,
    static ARRAY: DataTypeArray,
    static NONE: DataTypeVirtual,
    static ENUM: DataTypeEnum,
    static RANGE: DataTypeRange,
    static REAL: DataTypeReal,
    static DOUBLE: DataTypeDouble,
    static GEOMETRY: DataTypeGeometry,

    /**
     * Add a hook to the model
     * @param hookType
     * @param name Provide a name for the hook function. It can be used to remove the hook later or to order
     hooks based on some sort of priority system in the future.
     * @param fn The hook function
     * @alias  hook
     */
    static addHook(hookType: string, name: string, fn: Function): this,
    static addHook(hookType: string, fn: Function): this,
    static hook(hookType: string, name: string, fn: Function): this,
    static hook(hookType: string, fn: Function): this,

    /**
     * Remove hook from the model
     * @param hookType
     * @param name
     */
    static removeHook(hookType: string, name: string): this,

    /**
     * Check whether the model has any hooks of this type
     * @param hookType
     * @alias  hasHooks
     */
    static hasHook(hookType: string): boolean,
    static hasHooks(hookType: string): boolean,

    /**
     * A hook that is run before validation
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    static beforeValidate(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    static beforeValidate(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run after validation
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    static afterValidate(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    static afterValidate(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run after validation
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    static validationFailed(
      name: string,
      fn: AsyncFn3<Model<any>, Object, ValidationError>): void,
    static validationFailed(fn: AsyncFn3<Model<any>, Object, ValidationError>): void,

    /**
     * A hook that is run before creating a single instance
     * @param name
     * @param fn A callback function that is called with attributes, options
     */
    static beforeCreate(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    static beforeCreate(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run after creating a single instance
     * @param name
     * @param fn A callback function that is called with attributes, options
     */
    static afterCreate(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    static afterCreate(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run before destroying a single instance
     * @param name
     * @param fn A callback function that is called with instance, options
     * @alias  beforeDelete
     */
    static beforeDestroy(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    static beforeDestroy(fn: AsyncFn2<Model<any>, Object>): void,
    static beforeDelete(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    static beforeDelete(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run after destroying a single instance
     * @param name
     * @param fn A callback function that is called with instance, options
     * @alias  afterDelete
     */
    static afterDestroy(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    static afterDestroy(fn: AsyncFn2<Model<any>, Object>): void,
    static afterDelete(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    static afterDelete(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run before updating a single instance
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    static beforeUpdate(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    static beforeUpdate(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run after updating a single instance
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    static afterUpdate(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    static afterUpdate(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run before creating instances in bulk
     * @param name
     * @param fn A callback function that is called with instances, options
     */
    static beforeBulkCreate(
      name: string,
      fn: AsyncFn2<Model<any>[], Object>): void,
    static beforeBulkCreate(fn: AsyncFn2<Model<any>[], Object>): void,

    /**
     * A hook that is run after creating instances in bulk
     * @param name
     * @param fn A callback function that is called with instances, options
     * @name  afterBulkCreate
     */
    static afterBulkCreate(
      name: string,
      fn: AsyncFn2<Model<any>[], Object>): void,
    static afterBulkCreate(fn: AsyncFn2<Model<any>[], Object>): void,

    /**
     * A hook that is run before destroying instances in bulk
     * @param name
     * @param fn A callback function that is called with options
     * @alias  beforeBulkDelete
     */
    static beforeBulkDestroy(name: string, fn: AsyncFn1<Object>): void,
    static beforeBulkDestroy(fn: AsyncFn1<Object>): void,
    static beforeBulkDelete(name: string, fn: AsyncFn1<Object>): void,
    static beforeBulkDelete(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run after destroying instances in bulk
     * @param name
     * @param fn A callback function that is called with options
     * @alias  afterBulkDelete
     */
    static afterBulkDestroy(name: string, fn: AsyncFn1<Object>): void,
    static afterBulkDestroy(fn: AsyncFn1<Object>): void,
    static afterBulkDelete(name: string, fn: AsyncFn1<Object>): void,
    static afterBulkDelete(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run after updating instances in bulk
     * @param name
     * @param fn A callback function that is called with options
     */
    static beforeBulkUpdate(name: string, fn: AsyncFn1<Object>): void,
    static beforeBulkUpdate(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run after updating instances in bulk
     * @param name
     * @param fn A callback function that is called with options
     */
    static afterBulkUpdate(name: string, fn: AsyncFn1<Object>): void,
    static afterBulkUpdate(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run before a find (select) query
     * @param name
     * @param fn A callback function that is called with options
     */
    static beforeFind(name: string, fn: AsyncFn1<Object>): void,
    static beforeFind(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run before a find (select) query, after any { include: {all: ...} } options are expanded
     * @param name
     * @param fn A callback function that is called with options
     */
    static beforeFindAfterExpandIncludeAll(name: string, fn: AsyncFn1<Object>): void,
    static beforeFindAfterExpandIncludeAll(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run before a find (select) query, after all option parsing is complete
     * @param name
     * @param fn A callback function that is called with options
     */
    static beforeFindAfterOptions(name: string, fn: AsyncFn1<Object>): void,
    static beforeFindAfterOptions(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run after a find (select) query
     * @param name
     * @param fn A callback function that is called with instance(s), options
     */
    static afterFind(
      name: string,
      AsyncFn2<Model<any> | Model<any>[], Object>): void,
    static afterFind(
      AsyncFn2<Model<any> | Model<any>[], Object>): void,

    /**
     * A hook that is run before a define call
     * @param name
     * @param fn A callback function that is called with attributes, options
     */
    static beforeDefine(
      name: string,
      fn: AsyncFn2<DefineAttributes, Object>): void,
    static beforeDefine(fn: AsyncFn2<DefineAttributes, Object>): void,

    /**
     * A hook that is run after a define call
     * @param name
     * @param fn A callback function that is called with factory
     */
    static afterDefine(name: string, fn: AsyncFn1<Model<Model<any>, any>>): void,
    static afterDefine(fn: AsyncFn1<Model<Model<any>, any>>): void,

    /**
     * A hook that is run before Sequelize() call
     * @param name
     * @param fn A callback function that is called with config, options
     */
    static beforeInit(name: string, fn: AsyncFn2<Object, Object>): void,
    static beforeInit(fn: AsyncFn2<Object, Object>): void,

    /**
     * A hook that is run after Sequelize() call
     * @param name
     * @param fn A callback function that is called with sequelize
     */
    static afterInit(name: string, fn: AsyncFn1<Sequelize>): void,
    static afterInit(fn: AsyncFn1<Sequelize>): void,

    /**
     * A hook that is run before Model.sync call
     * @param name
     * @param fn A callback function that is called with options passed to Model.sync
     */
    static beforeSync(name: string, fn: AsyncFn1<SyncOptions>): void,
    static beforeSync(fn: AsyncFn1<SyncOptions>): void,

    /**
     * A hook that is run after Model.sync call
     * @param name
     * @param fn A callback function that is called with options passed to Model.sync
     */
    static afterSync(name: string, fn: AsyncFn1<SyncOptions>): void,
    static afterSync(fn: AsyncFn1<SyncOptions>): void,

    /**
     * A hook that is run before sequelize.sync call
     * @param name
     * @param fn A callback function that is called with options passed to sequelize.sync
     */
    static beforeBulkSync(name: string, fn: AsyncFn1<SyncOptions>): void,
    static beforeBulkSync(fn: AsyncFn1<SyncOptions>): void,

    /**
     * A hook that is run after sequelize.sync call
     * @param name
     * @param fn A callback function that is called with options passed to sequelize.sync
     */
    static afterBulkSync(name: string, fn: AsyncFn1<SyncOptions>): void,
    static afterBulkSync(fn: AsyncFn1<SyncOptions>): void,

    /**
     * Add a hook to the model
     * @param hookType
     * @param name Provide a name for the hook function. It can be used to remove the hook later or to order
     hooks based on some sort of priority system in the future.
     * @param fn The hook function
     * @alias  hook
     */
    addHook(hookType: string, name: string, fn: Function): this,
    addHook(hookType: string, fn: Function): this,
    hook(hookType: string, name: string, fn: Function): this,
    hook(hookType: string, fn: Function): this,

    /**
     * Remove hook from the model
     * @param hookType
     * @param name
     */
    removeHook(hookType: string, name: string): this,

    /**
     * Check whether the model has any hooks of this type
     * @param hookType
     * @alias  hasHooks
     */
    hasHook(hookType: string): boolean,
    hasHooks(hookType: string): boolean,

    /**
     * A hook that is run before validation
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    beforeValidate(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    beforeValidate(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run after validation
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    afterValidate(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    afterValidate(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run after validation
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    validationFailed(
      name: string,
      fn: AsyncFn3<Model<any>, Object, ValidationError>): void,
    validationFailed(fn: AsyncFn3<Model<any>, Object, ValidationError>): void,

    /**
     * A hook that is run before creating a single instance
     * @param name
     * @param fn A callback function that is called with attributes, options
     */
    beforeCreate(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    beforeCreate(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run after creating a single instance
     * @param name
     * @param fn A callback function that is called with attributes, options
     */
    afterCreate(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    afterCreate(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run before destroying a single instance
     * @param name
     * @param fn A callback function that is called with instance, options
     * @alias  beforeDelete
     */
    beforeDestroy(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    beforeDestroy(fn: AsyncFn2<Model<any>, Object>): void,
    beforeDelete(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    beforeDelete(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run after destroying a single instance
     * @param name
     * @param fn A callback function that is called with instance, options
     * @alias  afterDelete
     */
    afterDestroy(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    afterDestroy(fn: AsyncFn2<Model<any>, Object>): void,
    afterDelete(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    afterDelete(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run before updating a single instance
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    beforeUpdate(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    beforeUpdate(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run after updating a single instance
     * @param name
     * @param fn A callback function that is called with instance, options
     */
    afterUpdate(
      name: string,
      fn: AsyncFn2<Model<any>, Object>): void,
    afterUpdate(fn: AsyncFn2<Model<any>, Object>): void,

    /**
     * A hook that is run before creating instances in bulk
     * @param name
     * @param fn A callback function that is called with instances, options
     */
    beforeBulkCreate(
      name: string,
      fn: AsyncFn2<Model<any>[], Object>): void,
    beforeBulkCreate(fn: AsyncFn2<Model<any>[], Object>): void,

    /**
     * A hook that is run after creating instances in bulk
     * @param name
     * @param fn A callback function that is called with instances, options
     * @name  afterBulkCreate
     */
    afterBulkCreate(
      name: string,
      fn: AsyncFn2<Model<any>[], Object>): void,
    afterBulkCreate(fn: AsyncFn2<Model<any>[], Object>): void,

    /**
     * A hook that is run before destroying instances in bulk
     * @param name
     * @param fn A callback function that is called with options
     * @alias  beforeBulkDelete
     */
    beforeBulkDestroy(name: string, fn: AsyncFn1<Object>): void,
    beforeBulkDestroy(fn: AsyncFn1<Object>): void,
    beforeBulkDelete(name: string, fn: AsyncFn1<Object>): void,
    beforeBulkDelete(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run after destroying instances in bulk
     * @param name
     * @param fn A callback function that is called with options
     * @alias  afterBulkDelete
     */
    afterBulkDestroy(name: string, fn: AsyncFn1<Object>): void,
    afterBulkDestroy(fn: AsyncFn1<Object>): void,
    afterBulkDelete(name: string, fn: AsyncFn1<Object>): void,
    afterBulkDelete(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run after updating instances in bulk
     * @param name
     * @param fn A callback function that is called with options
     */
    beforeBulkUpdate(name: string, fn: AsyncFn1<Object>): void,
    beforeBulkUpdate(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run after updating instances in bulk
     * @param name
     * @param fn A callback function that is called with options
     */
    afterBulkUpdate(name: string, fn: AsyncFn1<Object>): void,
    afterBulkUpdate(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run before a find (select) query
     * @param name
     * @param fn A callback function that is called with options
     */
    beforeFind(name: string, fn: AsyncFn1<Object>): void,
    beforeFind(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run before a find (select) query, after any { include: {all: ...} } options are expanded
     * @param name
     * @param fn A callback function that is called with options
     */
    beforeFindAfterExpandIncludeAll(name: string, fn: AsyncFn1<Object>): void,
    beforeFindAfterExpandIncludeAll(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run before a find (select) query, after all option parsing is complete
     * @param name
     * @param fn A callback function that is called with options
     */
    beforeFindAfterOptions(name: string, fn: AsyncFn1<Object>): void,
    beforeFindAfterOptions(fn: AsyncFn1<Object>): void,

    /**
     * A hook that is run after a find (select) query
     * @param name
     * @param fn A callback function that is called with instance(s), options
     */
    afterFind(
      name: string,
      AsyncFn2<Model<any> | Model<any>[], Object>): void,
    afterFind(
      AsyncFn2<Model<any> | Model<any>[], Object>): void,

    /**
     * A hook that is run before a define call
     * @param name
     * @param fn A callback function that is called with attributes, options
     */
    beforeDefine(
      name: string,
      fn: AsyncFn2<DefineAttributes, Object>): void,
    beforeDefine(fn: AsyncFn2<DefineAttributes, Object>): void,

    /**
     * A hook that is run after a define call
     * @param name
     * @param fn A callback function that is called with factory
     */
    afterDefine(name: string, fn: AsyncFn1<Model<Model<any>, any>>): void,
    afterDefine(fn: AsyncFn1<Model<Model<any>, any>>): void,

    /**
     * A hook that is run before Sequelize() call
     * @param name
     * @param fn A callback function that is called with config, options
     */
    beforeInit(name: string, fn: AsyncFn2<Object, Object>): void,
    beforeInit(fn: AsyncFn2<Object, Object>): void,

    /**
     * A hook that is run after Sequelize() call
     * @param name
     * @param fn A callback function that is called with sequelize
     */
    afterInit(name: string, fn: AsyncFn1<Sequelize>): void,
    afterInit(fn: AsyncFn1<Sequelize>): void,

    /**
     * A hook that is run before Model.sync call
     * @param name
     * @param fn A callback function that is called with options passed to Model.sync
     */
    beforeSync(name: string, fn: AsyncFn1<SyncOptions>): void,
    beforeSync(fn: AsyncFn1<SyncOptions>): void,

    /**
     * A hook that is run after Model.sync call
     * @param name
     * @param fn A callback function that is called with options passed to Model.sync
     */
    afterSync(name: string, fn: AsyncFn1<SyncOptions>): void,
    afterSync(fn: AsyncFn1<SyncOptions>): void,

    /**
     * A hook that is run before sequelize.sync call
     * @param name
     * @param fn A callback function that is called with options passed to sequelize.sync
     */
    beforeBulkSync(name: string, fn: AsyncFn1<SyncOptions>): void,
    beforeBulkSync(fn: AsyncFn1<SyncOptions>): void,

    /**
     * A hook that is run after sequelize.sync call
     * @param name
     * @param fn A callback function that is called with options passed to sequelize.sync
     */
    afterBulkSync(name: string, fn: AsyncFn1<SyncOptions>): void,
    afterBulkSync(fn: AsyncFn1<SyncOptions>): void,

  /**
     * Defined models.
     */
    models: ModelsHashInterface,

    /**
     * Defined options.
     */
    options: Options,

    /**
     * Returns the specified dialect.
     */
    getDialect(): string,

    /**
     * Returns an instance of QueryInterface.
     */
    getQueryInterface(): QueryInterface,

    /**
     * Define a new model, representing a table in the DB.
     *
    The table columns are define by the hash that is given as the second argument. Each attribute of the
    hash
    represents a column. A short table definition might look like this:

    ```js
    sequelize.define('modelName', {
       columnA: {
         type: Sequelize.BOOLEAN,
         validate: {
           is: ["[a-z]",'i'],    // will only allow letters
           max: 23,          // only allow values <= 23
           isIn: {
           args: [['en', 'zh']],
           msg: "Must be English or Chinese"
           }
         },
         field: 'column_a'
         // Other attributes here
       },
       columnB: Sequelize.STRING,
       columnC: 'MY VERY OWN COLUMN TYPE'
    })

    sequelize.models.modelName // The model will now be available in models under the name given to define
    ```

    As shown above, column definitions can be either strings, a reference to one of the datatypes that are
    predefined on the Sequelize constructor, or an object that allows you to specify both the type of the
    column, and other attributes such as default values, foreign key constraints and custom setters and
    getters.

    For a list of possible data types, see
    http://docs.sequelizejs.com/en/latest/docs/models-definition/#data-types

    For more about getters and setters, see
    http://docs.sequelizejs.com/en/latest/docs/models-definition/#getters-setters

    For more about instance and class methods, see
    http://docs.sequelizejs.com/en/latest/docs/models-definition/#expansion-of-models

    For more about validation, see
    http://docs.sequelizejs.com/en/latest/docs/models-definition/#validations
     * @param modelName The name of the model. The model will be stored in `sequelize.models` under this name
     * @param attributes An object, where each attribute is a column of the table. Each column can be either a
    DataType, a string or a type-description object, with the properties described below:
     * @param options These options are merged with the default define options provided to the Sequelize
    constructor
    */
    define<TAttributes, TPlainAttributes, TInstance: Model<TAttributes, TPlainAttributes>>(
      modelName: string,
      attributes: DefineAttributes,
      options?: DefineOptions<TInstance>): Class<TInstance>,

    /**
     * Fetch a Model which is already defined
     * @param modelName The name of a model defined with Sequelize.define
     */
    model<ModelClass: Class<Model<any>>>(modelName: string): ModelClass,

    /**
     * Checks whether a model with the given name is defined
     * @param modelName The name of a model defined with Sequelize.define
     */
    isDefined(modelName: string): boolean,

    /**
     * Imports a model defined in another file
     *
    Imported models are cached, so multiple calls to import with the same path will not load the file
    multiple times

    See https://github.com/sequelize/sequelize/blob/master/examples/using-multiple-model-files/Task.js for a
    short example of how to define your models in separate files so that they can be imported by
    sequelize.import
     * @param path The path to the file that holds the model you want to import. If the part is relative, it
    will be resolved relatively to the calling file
     * @param defineFunction An optional function that provides model definitions. Useful if you do not
    want to use the module root as the define function
    */
    import<ModelClass: Class<Model<any>>>(
      path: string,
      defineFunction?: (
        sequelize: Sequelize,
        dataTypes: DataTypes) => ModelClass): ModelClass,

    /**
     * Execute a query on the DB, with the posibility to bypass all the sequelize goodness.
     *
    By default, the function will return two arguments: an array of results, and a metadata object,
    containing number of affected rows etc. Use `.spread` to access the results.

    If you are running a type of query where you don't need the metadata, for example a `SELECT` query, you
    can pass in a query type to make sequelize format the results:

    ```js
    sequelize.query('SELECT...').spread(function (results, metadata) {
       // Raw query - use spread
    });

    sequelize.query('SELECT...', { type: sequelize.QueryTypes.SELECT }).then(function (results) {
       // SELECT query - use then
    })
    ```
     * @param sql
     * @param options Query options
    */
    query(
      sql: string | {
        query: string,
        values: any[]
      },
      options?: QueryOptions): Promise<any>,

    /**
     * Execute a query which would set an environment or user variable. The variables are set per connection,
     * so this function needs a transaction.

    Only works for MySQL.
     * @param variables Object with multiple variables.
     * @param options Query options.
    */
    set(
      variables: Object,
      options: QueryOptionsTransactionRequired): Promise<any>,

    /**
     * Escape value.
     * @param value Value that needs to be escaped
     */
    escape(value: string): string,

    /**
     * Create a new database schema.
     *
    Note,that this is a schema in the
    [postgres sense of the word](http://www.postgresql.org/docs/9.1/static/ddl-schemas.html),
    not a database table. In mysql and sqlite, this command will do nothing.
     * @param schema Name of the schema
     * @param options Options supplied
     * @param options .logging A function that logs sql queries, or false for no logging
    */
    createSchema(schema: string, options: {
      logging?: boolean | Function
    }): Promise<any>,

    /**
     * Show all defined schemas
     *
    Note,that this is a schema in the
    [postgres sense of the word](http://www.postgresql.org/docs/9.1/static/ddl-schemas.html),
    not a database table. In mysql and sqlite, this will show all tables.
     * @param options Options supplied
     * @param options .logging A function that logs sql queries, or false for no logging
    */
    showAllSchemas(options: {
      logging?: boolean | Function
    }): Promise<any>,

    /**
     * Drop a single schema
     *
    Note,that this is a schema in the
    [postgres sense of the word](http://www.postgresql.org/docs/9.1/static/ddl-schemas.html),
    not a database table. In mysql and sqlite, this drop a table matching the schema name
     * @param schema Name of the schema
     * @param options Options supplied
     * @param options .logging A function that logs sql queries, or false for no logging
    */
    dropSchema(schema: string, options: {
      logging?: boolean | Function
    }): Promise<any>,

    /**
     * Drop all schemas
     *
    Note,that this is a schema in the
    [postgres sense of the word](http://www.postgresql.org/docs/9.1/static/ddl-schemas.html),
    not a database table. In mysql and sqlite, this is the equivalent of drop all tables.
     * @param options Options supplied
     * @param options .logging A function that logs sql queries, or false for no logging
    */
    dropAllSchemas(options: {
      logging?: boolean | Function
    }): Promise<any>,

    /**
     * Sync all defined models to the DB.
     * @param options Sync Options
     */
    sync(options?: SyncOptions): Promise<any>,

    /**
     * Truncate all tables defined through the sequelize models. This is done
     * by calling Model.truncate() on each model.
     * @param  The options passed to Model.destroy in addition to truncate
     * @param  .transaction]
     * @param  .logging] A function that logs sql queries, or false for no logging
     */
    truncate(options?: DestroyOptions): Promise<any>,

    /**
     * Drop all tables defined through this sequelize instance. This is done by calling Model.drop on each model
     * @see  {Model#drop} for options
     * @param options The options passed to each call to Model.drop
     */
    drop(options?: DropOptions): Promise<any>,

    /**
     * Test the connection by trying to authenticate
     * @param options Query Options for authentication
     */
    authenticate(options?: QueryOptions): Promise<void>,
    validate(options?: QueryOptions): Promise<ValidationError>,

    /**
     * Start a transaction. When using transactions, you should pass the transaction in the options argument
     * in order for the query to happen under that transaction

    ```js
    sequelize.transaction().then(function (t) {
       return User.find(..., { transaction: t}).then(function (user) {
       return user.updateAttributes(..., { transaction: t});
       })
       .then(t.commit.bind(t))
       .catch(t.rollback.bind(t));
    })
    ```

    A syntax for automatically committing or rolling back based on the promise chain resolution is also
    supported:

    ```js
    sequelize.transaction(function (t) { // Note that we use a callback rather than a promise.then()
       return User.find(..., { transaction: t}).then(function (user) {
       return user.updateAttributes(..., { transaction: t});
       });
    }).then(function () {
       // Commited
    }).catch(function (err) {
       // Rolled back
       console.error(err);
    });
    ```

    If you have [CLS](https://github.com/othiym23/node-continuation-local-storage) enabled, the transaction
    will automatically be passed to any query that runs witin the callback. To enable CLS, add it do your
    project, create a namespace and set it on the sequelize constructor:

    ```js
    var cls = require('continuation-local-storage'),
       ns = cls.createNamespace('....');
    var Sequelize = require('sequelize');
    Sequelize.cls = ns;
    ```
    Note, that CLS is enabled for all sequelize instances, and all instances will share the same namespace
     * @param options Transaction Options
     * @param autoCallback Callback for the transaction
    */
    transaction<T, Fn: TransactionAutoCallback<T>>(autoCallback: Fn): Promise<T>,
    transaction<T, Fn: TransactionAutoCallback<T>>(
      options: TransactionOptions,
      autoCallback: Fn): Promise<T>,
    transaction(options?: TransactionOptions): Promise<Transaction>,

    /**
     * Close all connections used by this sequelize instance, and free all references so the instance can be
     * garbage collected.

    Normally this is done on process exit, so you only need to call this method if you are creating multiple
    instances, and want to garbage collect some of them.
    */
    close(): Promise<void>,

    /**
     * Returns the database version
     */
    databaseVersion(): Promise<string>,
  }



  /**
   * Validator Interface
   */
  declare export type Validator = {
    notEmpty(str: string): boolean,
    len(str: string, min: number, max: number): boolean,
    isUrl(str: string): boolean,
    isIPv6(str: string): boolean,
    isIPv4(str: string): boolean,
    notIn(str: string, values: string[]): boolean,
    regex(str: string, pattern: string, modifiers: string): boolean,
    notRegex(str: string, pattern: string, modifiers: string): boolean,
    isDecimal(str: string): boolean,
    min(str: string, val: number): boolean,
    max(str: string, val: number): boolean,
    not(str: string, pattern: string, modifiers: string): boolean,
    contains(str: string, element: string[]): boolean,
    notContains(str: string, element: string[]): boolean,
    is(str: string, pattern: string, modifiers: string): boolean
  }


  /**
   * The transaction object is used to identify a running transaction. It is created by calling
   * `Sequelize.transaction()`.

  To run a query under a transaction, you should pass the transaction in the options object.
  */
  declare export class Transaction {
    /**
     * Commit the transaction
     */
    commit(): Promise<void>,

    /**
     * Rollback (abort) the transaction
     */
    rollback(): Promise<void>,

    /**
     * Isolations levels can be set per-transaction by passing `options.isolationLevel` to
     * `sequelize.transaction`. Default to `REPEATABLE_READ` but you can override the default isolation level
     by passing
     `options.isolationLevel` in `new Sequelize`.

     The possible isolations levels to use when starting a transaction:

     ```js
     {
        READ_UNCOMMITTED: "READ_UNCOMMITTED",
        READ_COMMITTED: "READ_COMMITTED",
        REPEATABLE_READ: "REPEATABLE_READ",
        SERIALIZABLE: "SERIALIZABLE"
     }
     ```

     Pass in the desired level as the first argument:

     ```js
     return sequelize.transaction({
       isolationLevel: Sequelize.Transaction.SERIALIZABLE
    }, function (t) {

      // your transactions

    }).then(function(result) {
       // transaction has been committed. Do something after the commit if required.
    }).catch(function(err) {
       // do something with the err.
    });
     ```
     * @see  ISOLATION_LEVELS
     */
    static ISOLATION_LEVELS: TransactionIsolationLevels,
    ISOLATION_LEVELS: TransactionIsolationLevels,

    /**
     * Transaction type can be set per-transaction by passing `options.type` to
     * `sequelize.transaction`. Default to `DEFERRED` but you can override the default isolation level
     by passing `options.transactionType` in `new Sequelize`.

     The transaction types to use when starting a transaction:

     ```js
     {
        DEFERRED: "DEFERRED",
        IMMEDIATE: "IMMEDIATE",
        EXCLUSIVE: "EXCLUSIVE"
     }
     ```

     Pass in the transaction type the first argument:

     ```js
     return sequelize.transaction({
       type: Sequelize.Transaction.EXCLUSIVE
    }, function (t) {

      // your transactions

    }).then(function(result) {
       // transaction has been committed. Do something after the commit if required.
    }).catch(function(err) {
       // do something with the err.
    });
     ```
     * @see  Sequelize.Transaction.TYPES
     */
    static TYPES: TransactionTypes,
    TYPES: TransactionTypes,

    /**
     * Possible options for row locking. Used in conjuction with `find` calls:
     *
     ```js
     t1 // is a transaction
     t1.LOCK.UPDATE,
     t1.LOCK.SHARE,
     t1.LOCK.KEY_SHARE, // Postgres 9.3+ only
     t1.LOCK.NO_KEY_UPDATE // Postgres 9.3+ only
     ```

     Usage:
     ```js
     t1 // is a transaction
     Model.findAll({
       where: ...,
       transaction: t1,
       lock: t1.LOCK...
    });
     ```

     Postgres also supports specific locks while eager loading by using OF:
     ```js
     UserModel.findAll({
       where: ...,
       include: [TaskModel, ...],
       transaction: t1,
       lock: {
       level: t1.LOCK...,
       of: UserModel
       }
    });
     ```
     UserModel will be locked but TaskModel won't!
     */
    static LOCK: TransactionLock,
    LOCK: TransactionLock,
  }

  declare export type TransactionIsolationLevelReadUncommitted = 'READ_UNCOMMITTED';

  declare export type TransactionIsolationLevelReadCommitted = 'READ_COMMITTED';

  declare export type TransactionIsolationLevelRepeatableRead = 'REPEATABLE_READ';

  declare export type TransactionIsolationLevelSerializable = 'SERIALIZABLE';

  declare export type TransactionIsolationLevel = TransactionIsolationLevelReadUncommitted | TransactionIsolationLevelReadCommitted | TransactionIsolationLevelRepeatableRead | TransactionIsolationLevelSerializable;


  /**
   * Isolations levels can be set per-transaction by passing `options.isolationLevel` to `sequelize.transaction`.
   * Default to `REPEATABLE_READ` but you can override the default isolation level by passing
  `options.isolationLevel` in `new Sequelize`.
  */
  declare export type TransactionIsolationLevels = {
    READ_UNCOMMITTED: TransactionIsolationLevelReadUncommitted,
    READ_COMMITTED: TransactionIsolationLevelReadCommitted,
    REPEATABLE_READ: TransactionIsolationLevelRepeatableRead,
    SERIALIZABLE: TransactionIsolationLevelSerializable
  }

  declare export type TransactionTypeDeferred = 'DEFERRED';

  declare export type TransactionTypeImmediate = 'IMMEDIATE';

  declare export type TransactionTypeExclusive = 'EXCLUSIVE';

  declare export type TransactionType = TransactionTypeDeferred | TransactionTypeImmediate | TransactionTypeExclusive;


  /**
   * Transaction type can be set per-transaction by passing `options.type` to `sequelize.transaction`.
   * Default to `DEFERRED` but you can override the default isolation level by passing
  `options.transactionType` in `new Sequelize`.
  */
  declare export type TransactionTypes = {
    DEFERRED: TransactionTypeDeferred,
    IMMEDIATE: TransactionTypeImmediate,
    EXCLUSIVE: TransactionTypeExclusive
  }

  declare export type TransactionLockLevelUpdate = 'UPDATE';

  declare export type TransactionLockLevelShare = 'SHARE';

  declare export type TransactionLockLevelKeyShare = 'KEY_SHARE';

  declare export type TransactionLockLevelNoKeyUpdate = 'NO_KEY_UPDATE';

  declare export type TransactionLockLevel =
    TransactionLockLevelUpdate |
    TransactionLockLevelShare |
    TransactionLockLevelKeyShare |
    TransactionLockLevelNoKeyUpdate;

  /**
   * Possible options for row locking. Used in conjuction with `find` calls:
   */
  declare export type TransactionLock = {
    UPDATE: TransactionLockLevelUpdate,
    SHARE: TransactionLockLevelShare,
    KEY_SHARE: TransactionLockLevelKeyShare,
    NO_KEY_UPDATE: TransactionLockLevelNoKeyUpdate
  }


  /**
   * Options provided when the transaction is created
   * @see  sequelize.transaction()
   */
  declare export type TransactionOptions = {
    autocommit?: boolean,

    /**
     * See `Sequelize.Transaction.ISOLATION_LEVELS` for possible options
     */
    isolationLevel?: TransactionIsolationLevel,

    /**
     * See `Sequelize.Transaction.TYPES` for possible options
     */
    type?: TransactionType,

    /**
     * A function that gets executed while running the query to log the sql.
     */
    logging?: Function
  }

  declare type TransactionAutoCallback<T> = (t:Transaction) => Promise<T> | T

  declare export interface fn {
    fn: string,
    args: any[]
  }

  declare export interface col {
    col: string
  }

  declare export interface cast {
    val: any,
    type: string
  }

  declare export interface literal {
    val: any
  }

  declare export interface json {
    conditions?: Object,
    path?: string,
    value?: string | number | boolean
  }

  declare export interface where {
    attribute: Object,
    comparator?: string,
    logic: string | Object
  }
}
