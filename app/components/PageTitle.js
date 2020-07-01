// @flow
import * as React from "react";
import { Helmet } from "react-helmet";
import AuthStore from "stores/AuthStore";

type Props = {
  title: string,
  favicon?: string,
  auth: AuthStore,
};

const { auth } = this.props;
const { team } = auth;

const PageTitle = ({ title, favicon }: Props) => (
  <Helmet>
    <title>{`${title} - ${team.name}` | `${title} - Outline`}</title>
    <link
      rel="shortcut icon"
      type="image/png"
      href={favicon || "/favicon-32.png"}
      sizes="32x32"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </Helmet>
);

export default PageTitle;
