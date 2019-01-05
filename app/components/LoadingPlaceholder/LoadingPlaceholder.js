// @flow
import * as React from 'react';
import Mask from 'components/Mask';
import Fade from 'components/Fade';
import Flex from 'shared/components/Flex';

export default function LoadingPlaceholder(props: Object) {
  return (
    <Fade>
      <Flex column auto {...props}>
        <Mask height={34} />
        <br />
        <Mask />
        <Mask />
        <Mask />
      </Flex>
    </Fade>
  );
}
