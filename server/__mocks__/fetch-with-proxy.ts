import fetchMock from "jest-fetch-mock";

fetchMock.enableMocks();

// changes default behavior of fetchMock to use the real 'fetch' implementation.
// Mocks can now be enabled in each individual test with fetchMock.doMock()
fetchMock.dontMock();

export default fetch;
