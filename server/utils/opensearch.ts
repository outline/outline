import env from "@server/env";

export const opensearchResponse = (baseUrl: string): string => `
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/" xmlns:moz="http://www.mozilla.org/2006/browser/search/">
  <ShortName>${env.APP_NAME}</ShortName>
  <Description>Search ${env.APP_NAME}</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Image width="16" height="16" type="image/x-icon">${baseUrl}/images/favicon-16.png</Image>
  <Url type="text/html" method="get" template="${baseUrl}/search/{searchTerms}?ref=opensearch"/>
  <moz:SearchForm>${baseUrl}/search</moz:SearchForm>
</OpenSearchDescription>
`;
