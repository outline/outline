// @flow
import * as React from "react";
import SlackLogo from "../SlackLogo";
import GoogleLogo from "./GoogleLogo";

type Props = {|
  providerName: string,
  fill?: string,
|};

export default function AuthLogo({ providerName, fill }: Props) {
  switch (providerName) {
    case "slack":
      return <SlackLogo size={16} fill={fill} />;
    case "google":
      return <GoogleLogo size={16} fill={fill} />;
    default:
      return null;
  }
}
