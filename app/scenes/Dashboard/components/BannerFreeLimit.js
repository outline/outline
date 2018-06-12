// @flow
import * as React from 'react';
import Banner from 'components/Banner';
import { Link } from 'react-router-dom';

export default function BannerFreeLimit() {
  return (
    <Banner type="primary">
      Your team is at the limit of free users. To avoid documents becoming read
      only and support Outline{' '}
      <Link to="/settings/billing">please subscribe to a paid plan</Link>.
    </Banner>
  );
}
