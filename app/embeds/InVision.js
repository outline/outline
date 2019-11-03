// @flow
import * as React from 'react';
import ImageZoom from 'react-medium-image-zoom';
import Frame from './components/Frame';

const IFRAME_REGEX = new RegExp(
  '^https://(invis.io/.*)|(projects.invisionapp.com/share/.*)$'
);

const IMAGE_REGEX = new RegExp(
  '^https://(opal.invisionapp.com/static-signed/live-embed/.*)$'
);

type Props = {
  url: string,
};

export default class InVision extends React.Component<Props> {
  static ENABLED = [IFRAME_REGEX, IMAGE_REGEX];

  render() {
    if (IMAGE_REGEX.test(this.props.url)) {
      return (
        <ImageZoom
          image={{
            src: this.props.url,
            alt: 'InVision Embed',
            style: {
              maxWidth: '100%',
              maxHeight: '75vh',
            },
          }}
          shouldRespectMaxDimension
        />
      );
    }
    return <Frame src={this.props.url} title="InVision Embed" />;
  }
}
