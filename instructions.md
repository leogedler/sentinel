# Current feature branch

Right now we are ugint the helper `asyncHandler` in almost all routes.

Would be better to do a small refactor and move up using middleware to avoid the extra boilerplate when defining each route.