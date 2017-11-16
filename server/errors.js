// @flow
import httpErrors from 'http-errors';

const apiError = (code: number, id: string, message: string) => {
  return httpErrors(code, message, { id });
};

export default apiError;
export { httpErrors };
