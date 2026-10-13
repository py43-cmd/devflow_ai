const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

// Input limits keep prompts bounded. Generated-output limits keep the preview
// payload bounded even if the model is verbose.
const LIMITS = {
  // endpoint input
  path: 500,
  description: 3000,
  authentication: 500,
  requestBody: 10000,
  responseExample: 10000,
  errorExamples: 20,
  listItems: 50,
  name: 200,
  fieldDescription: 1000,
  errorMessage: 1000,

  // generated output
  title: 300,
  summary: 3000,
  authDescription: 1000,
  generatedDescription: 1000,
  example: 10000,
  responses: 20,
  errors: 20,
};

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const asString = (value) => (typeof value === "string" ? value.trim() : "");

const jsonLength = (value) => {
  try {
    return JSON.stringify(value ?? null).length;
  } catch {
    return Infinity;
  }
};

const normalizeMethod = (method) => {
  const value = typeof method === "string" ? method.trim().toUpperCase() : "";
  return HTTP_METHODS.includes(value) ? value : null;
};

// ---------------------------------------------------------------------------
// Input validation — the endpoint supplied by the developer.
// Returns { valid: true, data } or { valid: false, code, error }.
// ---------------------------------------------------------------------------

const normalizeInputParamList = (list, label) => {
  if (list === undefined || list === null) {
    return { value: [] };
  }

  if (!Array.isArray(list)) {
    return { error: `${label} must be an array` };
  }

  if (list.length > LIMITS.listItems) {
    return { error: `${label} exceeds the maximum of ${LIMITS.listItems} items` };
  }

  const value = [];

  for (const item of list) {
    if (!isPlainObject(item)) {
      return { error: `${label} contains an invalid item` };
    }

    value.push({
      name: asString(item.name).slice(0, LIMITS.name),
      type: asString(item.type).slice(0, 100) || "string",
      required: Boolean(item.required),
      description: asString(item.description).slice(0, LIMITS.fieldDescription),
    });
  }

  return { value };
};

const validateEndpointInput = (endpoint) => {
  if (!isPlainObject(endpoint)) {
    return { valid: false, code: "VALIDATION_ERROR", error: "endpoint must be an object" };
  }

  const method = normalizeMethod(endpoint.method);

  if (!method) {
    return {
      valid: false,
      code: "INVALID_HTTP_METHOD",
      error: `method must be one of ${HTTP_METHODS.join(", ")}`,
    };
  }

  const path = asString(endpoint.path);

  if (!path) {
    return { valid: false, code: "VALIDATION_ERROR", error: "path is required" };
  }

  if (path.length > LIMITS.path) {
    return {
      valid: false,
      code: "VALIDATION_ERROR",
      error: `path exceeds the maximum of ${LIMITS.path} characters`,
    };
  }

  const description = asString(endpoint.description);

  if (!description) {
    return { valid: false, code: "VALIDATION_ERROR", error: "description is required" };
  }

  if (description.length > LIMITS.description) {
    return {
      valid: false,
      code: "VALIDATION_ERROR",
      error: `description exceeds the maximum of ${LIMITS.description} characters`,
    };
  }

  const authentication = asString(endpoint.authentication);

  if (authentication.length > LIMITS.authentication) {
    return {
      valid: false,
      code: "VALIDATION_ERROR",
      error: `authentication exceeds the maximum of ${LIMITS.authentication} characters`,
    };
  }

  const headers = normalizeInputParamList(endpoint.requestHeaders, "requestHeaders");
  if (headers.error) {
    return { valid: false, code: "VALIDATION_ERROR", error: headers.error };
  }

  const queryParameters = normalizeInputParamList(
    endpoint.queryParameters,
    "queryParameters",
  );
  if (queryParameters.error) {
    return { valid: false, code: "VALIDATION_ERROR", error: queryParameters.error };
  }

  const pathParameters = normalizeInputParamList(
    endpoint.pathParameters,
    "pathParameters",
  );
  if (pathParameters.error) {
    return { valid: false, code: "VALIDATION_ERROR", error: pathParameters.error };
  }

  if (
    endpoint.requestBody !== undefined &&
    jsonLength(endpoint.requestBody) > LIMITS.requestBody
  ) {
    return {
      valid: false,
      code: "VALIDATION_ERROR",
      error: `requestBody exceeds the maximum of ${LIMITS.requestBody} characters`,
    };
  }

  if (
    endpoint.responseExample !== undefined &&
    jsonLength(endpoint.responseExample) > LIMITS.responseExample
  ) {
    return {
      valid: false,
      code: "VALIDATION_ERROR",
      error: `responseExample exceeds the maximum of ${LIMITS.responseExample} characters`,
    };
  }

  let errorExamples = [];

  if (endpoint.errorExamples !== undefined && endpoint.errorExamples !== null) {
    if (!Array.isArray(endpoint.errorExamples)) {
      return {
        valid: false,
        code: "VALIDATION_ERROR",
        error: "errorExamples must be an array",
      };
    }

    if (endpoint.errorExamples.length > LIMITS.errorExamples) {
      return {
        valid: false,
        code: "VALIDATION_ERROR",
        error: `errorExamples exceeds the maximum of ${LIMITS.errorExamples} items`,
      };
    }

    errorExamples = [];

    for (const item of endpoint.errorExamples) {
      if (!isPlainObject(item)) {
        return {
          valid: false,
          code: "VALIDATION_ERROR",
          error: "errorExamples contains an invalid item",
        };
      }

      const status = Number(item.status);

      errorExamples.push({
        status: Number.isFinite(status) ? status : null,
        message: asString(item.message).slice(0, LIMITS.errorMessage),
      });
    }
  }

  return {
    valid: true,
    data: {
      method,
      path,
      description,
      authentication,
      requestHeaders: headers.value,
      queryParameters: queryParameters.value,
      pathParameters: pathParameters.value,
      requestBody: endpoint.requestBody,
      responseExample: endpoint.responseExample,
      errorExamples,
    },
  };
};

// ---------------------------------------------------------------------------
// Output validation — the structured documentation returned by the AI.
// Returns { valid: true, data } or { valid: false, error }.
// ---------------------------------------------------------------------------

const clampText = (value, max) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > max ? text.slice(0, max) : text;
};

const normalizeOutputParamList = (list) => {
  if (!Array.isArray(list)) {
    return [];
  }

  return list.slice(0, LIMITS.listItems).map((item) => {
    const source = isPlainObject(item) ? item : {};
    return {
      name: clampText(source.name, LIMITS.name),
      type: clampText(source.type, 100) || "string",
      required: Boolean(source.required),
      description: clampText(source.description, LIMITS.fieldDescription),
    };
  });
};

const validateDocumentation = (value) => {
  if (!isPlainObject(value)) {
    return { valid: false, error: "AI response is not a JSON object" };
  }

  if (typeof value.title !== "string" || !value.title.trim()) {
    return { valid: false, error: 'AI response is missing a valid "title" field' };
  }

  if (typeof value.summary !== "string" || !value.summary.trim()) {
    return { valid: false, error: 'AI response is missing a valid "summary" field' };
  }

  const method = normalizeMethod(value.method);

  if (!method) {
    return { valid: false, error: "AI response has an invalid HTTP method" };
  }

  if (typeof value.path !== "string" || !value.path.trim()) {
    return { valid: false, error: 'AI response is missing a valid "path" field' };
  }

  if (!isPlainObject(value.authentication)) {
    return { valid: false, error: 'AI response is missing a valid "authentication" object' };
  }

  if (!isPlainObject(value.request)) {
    return { valid: false, error: 'AI response is missing a valid "request" object' };
  }

  if (!Array.isArray(value.responses)) {
    return { valid: false, error: 'AI response is missing a "responses" array' };
  }

  if (!Array.isArray(value.errors)) {
    return { valid: false, error: 'AI response is missing an "errors" array' };
  }

  if (typeof value.exampleRequest !== "string") {
    return { valid: false, error: 'AI response is missing an "exampleRequest" string' };
  }

  if (typeof value.exampleResponse !== "string") {
    return { valid: false, error: 'AI response is missing an "exampleResponse" string' };
  }

  const responses = [];

  for (const item of value.responses.slice(0, LIMITS.responses)) {
    if (!isPlainObject(item)) {
      return { valid: false, error: "AI response contains an invalid response entry" };
    }

    const status = Number(item.status);

    if (!Number.isFinite(status)) {
      return {
        valid: false,
        error: "AI response contains a response entry with an invalid status",
      };
    }

    responses.push({
      status,
      description: clampText(item.description, LIMITS.generatedDescription),
      ...(item.example !== undefined ? { example: item.example } : {}),
    });
  }

  const errors = [];

  for (const item of value.errors.slice(0, LIMITS.errors)) {
    if (!isPlainObject(item)) {
      return { valid: false, error: "AI response contains an invalid error entry" };
    }

    const status = Number(item.status);

    if (!Number.isFinite(status)) {
      return {
        valid: false,
        error: "AI response contains an error entry with an invalid status",
      };
    }

    errors.push({
      status,
      description: clampText(item.description, LIMITS.generatedDescription),
    });
  }

  const request = value.request;

  return {
    valid: true,
    data: {
      title: clampText(value.title, LIMITS.title),
      summary: clampText(value.summary, LIMITS.summary),
      method,
      path: clampText(value.path, LIMITS.path),
      authentication: {
        required: Boolean(value.authentication.required),
        description: clampText(value.authentication.description, LIMITS.authDescription),
      },
      request: {
        headers: normalizeOutputParamList(request.headers),
        pathParameters: normalizeOutputParamList(request.pathParameters),
        queryParameters: normalizeOutputParamList(request.queryParameters),
        body: request.body === undefined ? null : request.body,
      },
      responses,
      errors,
      exampleRequest: clampText(value.exampleRequest, LIMITS.example),
      exampleResponse: clampText(value.exampleResponse, LIMITS.example),
    },
  };
};

module.exports = {
  validateEndpointInput,
  validateDocumentation,
  normalizeMethod,
  HTTP_METHODS,
  LIMITS,
};
