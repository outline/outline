import { observable } from "mobx";
import {
  DataAttributeDataType,
  type DataAttributeOptions,
} from "@shared/models/types";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Field from "./decorators/Field";
import Relation from "./decorators/Relation";

class DataAttribute extends ParanoidModel {
  static modelName = "DataAttribute";

  /** The name of this data attribute. */
  @Field
  @observable
  name: string;

  /** A user-facing description for the data attribute. */
  @Field
  @observable
  description: string | null;

  /** The data type of this data attribute. Cannot be changed after creation. */
  @Field
  @observable
  dataType: DataAttributeDataType;

  /** Options for `list` data type. */
  @Field
  @observable
  options: DataAttributeOptions | null;

  /** Whether this data attribute is pinned to the top of the document. */
  @Field
  @observable
  pinned: boolean;

  /** The sort index of this data attribute. */
  @Field
  @observable
  index: number;

  /** The user that created this data attribute. */
  @Relation(() => User, { onDelete: "cascade" })
  createdBy?: User;

  /** The user ID that created this data attribute. */
  createdById: string;
}

export default DataAttribute;
