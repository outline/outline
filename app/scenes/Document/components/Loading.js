// @flow
import * as React from 'react';
import Container from './Container';
import LoadingPlaceholder from 'components/LoadingPlaceholder';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';

export default function Loading({ location }: Object) {
  return (
    <Container column auto>
      <PageTitle title={location.state ? location.state.title : 'Untitled'} />
      <CenteredContent>
        <LoadingPlaceholder />
      </CenteredContent>
    </Container>
  );
}
