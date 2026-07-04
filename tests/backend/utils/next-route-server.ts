import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

type NextRouteHandler = (request: Request) => Promise<Response> | Response;

async function readRequestBody(request: IncomingMessage): Promise<Uint8Array | undefined> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) return undefined;
  return new Uint8Array(Buffer.concat(chunks));
}

function buildHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }

  return headers;
}

async function sendResponse(response: Response, serverResponse: ServerResponse) {
  serverResponse.statusCode = response.status;
  response.headers.forEach((value, key) => {
    serverResponse.setHeader(key, value);
  });

  const body = Buffer.from(await response.arrayBuffer());
  serverResponse.end(body);
}

export function createNextRouteServer(handler: NextRouteHandler) {
  return createServer(async (request, response) => {
    try {
      const method = request.method ?? "GET";
      const url = `http://127.0.0.1${request.url ?? "/"}`;
      const body = method === "GET" || method === "HEAD" ? undefined : await readRequestBody(request);

      const nextRequest = new Request(url, {
        method,
        headers: buildHeaders(request),
        body,
      });

      await sendResponse(await handler(nextRequest), response);
    } catch (error) {
      response.statusCode = 500;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ error: "TEST_ROUTE_HANDLER_ERROR", message: String(error) }));
    }
  });
}
