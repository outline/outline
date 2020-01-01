// @flow
import * as React from 'react';
import type { Location } from 'react-router-dom';
import Container from './Container';
import LoadingPlaceholder from 'components/LoadingPlaceholder';
import CenteredContent from 'components/CenteredContent';
import PageTitle from 'components/PageTitle';

type Props = {|
  location: Location,
|};

export default function Loading({ location }: Props) {
  return (
    <Container column auto>
      <PageTitle title={location.state ? location.state.title : 'Untitled'} />
      <CenteredContent>
        <LoadingPlaceholder />
      </CenteredContent>
    </Container>
  );
}
