// @flow
import * as React from "react";
import styled from "styled-components";
import CenteredContent from "components/CenteredContent";
import Header from "components/Header";
import PageTitle from "components/PageTitle";

type Props = {|
  icon?: React.Node,
  title: React.Node,
  textTitle?: string,
  children: React.Node,
  breadcrumb?: React.Node,
  actions?: React.Node,
|};

function Scene({
  title,
  icon,
  textTitle,
  actions,
  breadcrumb,
  children,
}: Props) {
  return (
    <FillWidth>
      <PageTitle title={textTitle || title} />
      <Header
        title={
          icon ? (
            <>
              {icon}&nbsp;{title}
            </>
          ) : (
            title
          )
        }
        actions={actions}
        breadcrumb={breadcrumb}
      />
      <CenteredContent withStickyHeader>{children}</CenteredContent>
    </FillWidth>
  );
}

const FillWidth = styled.div`
  width: 100%;
`;

export default Scene;
