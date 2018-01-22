// @flow
import React from 'react';
import webpackConfig from '../../webpack.config';

const PUBLIC_PATH = webpackConfig.output.publicPath;

const prefetchTags = [
  <link rel="dns-prefetch" href={process.env.AWS_S3_UPLOAD_BUCKET_URL} />,
];

if (process.env.NODE_ENV === 'production') {
  try {
    const manifest = require('../../dist/manifest.json');
    Object.values(manifest).forEach(filename => {
      if (typeof filename !== 'string') return;
      if (filename.endsWith('.js')) {
        prefetchTags.push(
          <link rel="prefetch" href={`${PUBLIC_PATH}${filename}`} as="script" />
        );
      } else if (filename.endsWith('.css')) {
        prefetchTags.push(
          <link rel="prefetch" href={`${PUBLIC_PATH}${filename}`} as="style" />
        );
      }
    });
  } catch (_e) {
    console.warn(
      'Warning: Unable to load dist/manifest.json. Please `yarn build` before starting production server'
    );
  }
}

export default prefetchTags;
