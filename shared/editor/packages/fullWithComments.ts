import Extension from "../lib/Extension";
import Comment from "../marks/Comment";
import Mark from "../marks/Mark";
import Node from "../nodes/Node";
import fullPackage from "./full";

const fullWithCommentsPackage: (
  | typeof Node
  | typeof Mark
  | typeof Extension
)[] = [...fullPackage, Comment];

export default fullWithCommentsPackage;
