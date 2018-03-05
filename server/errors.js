// @flow
import httpErrors from 'http-errors';

export function AuthenticationError(
  message: string = 'Invalid authentication'
) {
  return httpErrors(401, message, { id: 'authentication_required' });
}

export function AuthorizationError(
  message: string = 'You do not have permission to access this resource'
) {
  return httpErrors(403, message, { id: 'permission_required' });
}

export function AdminRequiredError(
  message: string = 'An admin role is required to access this resource'
) {
  return httpErrors(403, message, { id: 'admin_required' });
}

export function UserSuspendedError(
  message: string = 'Your access has been suspended by the team admin'
) {
  return httpErrors(403, message, {
    id: 'user_suspended',
  });
}

export function InvalidRequestError(message: string = 'Request invalid') {
  return httpErrors(400, message, { id: 'invalid_request' });
}

export function NotFoundError(message: string = 'Resource not found') {
  return httpErrors(404, message, { id: 'not_found' });
}

export function ParamRequiredError(
  message: string = 'Required parameter missing'
) {
  return httpErrors(400, message, { id: 'param_required' });
}

export function ValidationError(message: string = 'Validation failed') {
  return httpErrors(400, message, { id: 'validation_error' });
}
