import httpErrors from 'http-errors';
import validator from 'validator';

export default function validation() {
  return function validationMiddleware(ctx, next) {
    ctx.assertPresent = function assertPresent(value, message) {
      if (value === undefined || value === null || value === '') {
        throw httpErrors.BadRequest(message);
      }
    };

    ctx.assertEmail = function assertEmail(value, message) {
      if (!validator.isEmail(value)) {
        throw httpErrors.BadRequest(message);
      }
    };

    ctx.assertUuid = function assertUuid(value, message) {
      if (!validator.isUUID(value)) {
        throw httpErrors.BadRequest(message);
      }
    };

    return next();
  };
}