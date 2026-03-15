export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "ApiError";
  }

  static notFound(message = "Not found"): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(401, "UNAUTHORIZED", message);
  }

  static badRequest(message = "Bad request"): ApiError {
    return new ApiError(400, "BAD_REQUEST", message);
  }

  static conflict(message = "Conflict"): ApiError {
    return new ApiError(409, "CONFLICT", message);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, "INTERNAL_ERROR", message);
  }
}

export function handleError(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status },
    );
  }

  console.error(err);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    { status: 500 },
  );
}
