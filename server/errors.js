import httpErrors from 'http-errors';

const apiError = (code, id, message) => {
  return httpErrors(code, message, { id });
};

export default apiError;
export { httpErrors };
