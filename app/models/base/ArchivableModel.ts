import { observable } from "mobx";
import ParanoidModel from "./ParanoidModel";

export default abstract class ArchivableModel extends ParanoidModel {
  @observable
  archivedAt: string | null;
}
