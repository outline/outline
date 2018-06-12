// @flow
import * as React from 'react';
import Banner from 'components/Banner';
import { Link } from 'react-router-dom';

export default function BannerSuspended() {
  return (
    <Banner type="warning">
      This team has reached the free user limit and documents are now in{' '}
      <strong>read-only</strong> mode.{' '}
      <Link to="/settings/billing">Please subscribe to a paid plan</Link> to
      continue using Outline.
    </Banner>
  );
}
