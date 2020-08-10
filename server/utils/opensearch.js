// @flow
export const opensearchResponse = (): string => {
  return `
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>Outline</ShortName>
  <Description>Search Outline</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="16" height="16" type="image/x-icon">${process.env.URL}/favicon.ico</Image>
  <Url type="text/html" method="get" template="${process.env.URL}/search/{searchTerms}?ref=opensearch"/>
  <moz:SearchForm>${process.env.URL}/search</moz:SearchForm>
</OpenSearchDescription>
`;
};
