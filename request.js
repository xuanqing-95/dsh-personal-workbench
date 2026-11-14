export function validUIWrite(request) {
  return !['cross-site','same-site'].includes(request.headers.get('sec-fetch-site'))
    && request.headers.get('x-personal-ui') === '1'
    && request.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase() === 'application/json';
}

export const isHarnessSession = value => typeof value === 'string'
  && /^(?:session-)?[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
