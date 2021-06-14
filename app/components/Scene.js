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
  centered?: boolean,
|};

function Scene({
  title,
  icon,
  textTitle,
  actions,
  breadcrumb,
  children,
  centered,
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
      {centered !== false ? (
        <CenteredContent withStickyHeader>{children}</CenteredContent>
      ) : (
        children
      )}
    </FillWidth>
  );
}

const FillWidth = styled.div`
  width: 100%;
`;

export default Scene;
