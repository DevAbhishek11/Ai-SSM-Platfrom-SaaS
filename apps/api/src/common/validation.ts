import { BadRequestException, ValidationPipe, type ValidationError } from "@nestjs/common";

/**
 * Flattens nested class-validator errors into `{ "field.path": [messages] }` so
 * a form can highlight the offending inputs instead of showing one blob of text.
 */
export function collectFieldErrors(
  errors: ValidationError[],
  parentPath = ""
): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;

    if (error.constraints) {
      fieldErrors[path] = Object.values(error.constraints);
    }

    if (error.children?.length) {
      for (const [childPath, messages] of Object.entries(collectFieldErrors(error.children, path))) {
        fieldErrors[childPath] = messages;
      }
    }
  }

  return fieldErrors;
}

/**
 * The single global validation pipe.
 *
 * `whitelist` + `forbidNonWhitelisted` mean an unexpected property is a 400
 * rather than a silently ignored field - important when the payload can carry
 * privilege-adjacent keys such as `role` or `workspaceId`.
 */
export function buildValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    stopAtFirstError: false,
    transformOptions: { enableImplicitConversion: false },
    exceptionFactory: (errors: ValidationError[]) => {
      const fieldErrors = collectFieldErrors(errors);
      const messages = Object.values(fieldErrors).flat();

      return new BadRequestException({
        statusCode: 400,
        error: "Bad Request",
        code: "validation_failed",
        message: messages.length > 0 ? messages.join(". ") : "Request validation failed",
        fieldErrors
      });
    }
  });
}
