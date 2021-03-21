// @flow
import * as React from "react";
import SlackLogo from "../SlackLogo";
import GoogleLogo from "./GoogleLogo";
import GithubLogo from "./GithubLogo"

type Props = {|
  providerName: string,
|};

export default function AuthLogo({ providerName }: Props) {
  switch (providerName) {
    case "slack":
      return <SlackLogo size={16} />;
    case "google":
      return <GoogleLogo size={16} />;
    case "github":
      return <GithubLogoLogo size={16} />;
    default:
      return null;
  }
}
