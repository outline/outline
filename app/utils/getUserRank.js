// @flow
import User from "models/User";
import Rank from "../../shared/utils/rankEnum";

export default function getUserRank(user: User) {
  if (user.isAdmin) {
    return Rank.ADMIN;
  } else if (user.isViewer) {
    return Rank.VIEWER;
  } else {
    return Rank.MEMBER;
  }
}
