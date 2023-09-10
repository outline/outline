import Model from "./Model";

export default abstract class ParanoidModel extends Model {
  deletedAt: string | undefined;
}
