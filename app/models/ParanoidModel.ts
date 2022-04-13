import BaseModel from "./BaseModel";

export default abstract class ParanoidModel extends BaseModel {
  deletedAt: string | undefined;
}
