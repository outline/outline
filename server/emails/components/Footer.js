// @flow
import * as React from 'react';
import { Table, TBody, TR, TD } from 'oy-vey';
import { color } from '../../../shared/styles/constants';
import { twitterUrl, spectrumUrl } from '../../../shared/utils/routeHelpers';

export default () => {
  const style = {
    padding: '20px 0',
    borderTop: `1px solid ${color.smokeDark}`,
    color: color.slate,
    fontSize: '14px',
  };

  const linkStyle = {
    color: color.slate,
    fontWeight: 500,
    textDecoration: 'none',
    marginRight: '10px',
  };

  const externalLinkStyle = {
    color: color.slate,
    textDecoration: 'none',
    margin: '0 10px',
  };

  return (
    <Table width="100%">
      <TBody>
        <TR>
          <TD style={style}>
            <a href={process.env.URL} style={linkStyle}>
              Outline
            </a>
            <a href={twitterUrl()} style={externalLinkStyle}>
              Twitter
            </a>
            <a href={spectrumUrl()} style={externalLinkStyle}>
              Spectrum
            </a>
          </TD>
        </TR>
      </TBody>
    </Table>
  );
};
