import { CorrelationIdMiddleware } from './correlation-id.middleware';
import type { Request, Response } from 'express';

type ReqWithId = Request & { id?: string };

function makeReq(xRequestId?: string): ReqWithId {
  const headers: Record<string, string> = {};
  if (xRequestId) headers['x-request-id'] = xRequestId;
  return { headers } as unknown as ReqWithId;
}

function makeRes(): { setHeader: jest.Mock; headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  return {
    headers,
    setHeader: jest.fn((name: string, value: string) => {
      headers[name] = value;
    }),
  };
}

describe('CorrelationIdMiddleware', () => {
  const middleware = new CorrelationIdMiddleware();

  it('uses incoming x-request-id if present', () => {
    const req = makeReq('my-trace-id');
    const res = makeRes();
    const next = jest.fn();

    middleware.use(req as unknown as Request, res as unknown as Response, next);

    expect(req.id).toBe('my-trace-id');
    expect(res.headers['x-request-id']).toBe('my-trace-id');
    expect(next).toHaveBeenCalled();
  });

  it('generates a UUID when x-request-id header is absent', () => {
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn();

    middleware.use(req as unknown as Request, res as unknown as Response, next);

    expect(req.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(res.headers['x-request-id']).toBe(req.id);
  });

  it('generates unique IDs for each request', () => {
    const req1 = makeReq();
    const req2 = makeReq();
    const res = makeRes();
    const next = jest.fn();

    middleware.use(
      req1 as unknown as Request,
      res as unknown as Response,
      next,
    );
    middleware.use(
      req2 as unknown as Request,
      res as unknown as Response,
      next,
    );

    expect(req1.id).not.toBe(req2.id);
  });
});
