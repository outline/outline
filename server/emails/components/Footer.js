// @flow
import * as React from 'react';
import { Table, TBody, TR, TD } from 'oy-vey';
import { twitterUrl, spectrumUrl } from '../../../shared/utils/routeHelpers';
import theme from '../../../shared/styles/theme';

export default () => {
  const style = {
    padding: '20px 0',
    borderTop: `1px solid ${theme.smokeDark}`,
    color: theme.slate,
    fontSize: '14px',
  };

  const linkStyle = {
    color: theme.slate,
    fontWeight: 500,
    textDecoration: 'none',
    marginRight: '10px',
  };

  const externalLinkStyle = {
    color: theme.slate,
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
