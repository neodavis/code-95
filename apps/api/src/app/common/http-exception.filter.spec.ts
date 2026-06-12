import {
  type ArgumentsHost,
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function makeHost(url = '/api/v1/test'): ArgumentsHost {
  const statusMock = jest.fn().mockReturnThis();
  const setHeaderMock = jest.fn().mockReturnThis();
  const jsonMock = jest.fn();
  const response = {
    status: statusMock,
    setHeader: setHeaderMock,
    json: jsonMock,
  };
  const request = { url };
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('maps HttpException to RFC 7807 format', () => {
    const host = makeHost('/api/v1/test');
    const http = host.switchToHttp();
    const response = http.getResponse<{
      status: jest.Mock;
      setHeader: jest.Mock;
      json: jest.Mock;
    }>();

    filter.catch(new NotFoundException('Study group not found'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/problem+json',
    );
    const body = response.json.mock.calls[0][0];
    expect(body.type).toBe('about:blank');
    expect(body.status).toBe(404);
    expect(body.title).toBe('NOT FOUND');
    expect(body.detail).toBe('Study group not found');
    expect(body.instance).toBe('/api/v1/test');
  });

  it('includes validation fields from BadRequestException object body', () => {
    const host = makeHost();
    const http = host.switchToHttp();
    const response = http.getResponse<{
      status: jest.Mock;
      setHeader: jest.Mock;
      json: jest.Mock;
    }>();

    filter.catch(
      new BadRequestException({
        message: 'Validation failed',
        fields: { name: ['required'] },
      }),
      host,
    );

    const body = response.json.mock.calls[0][0];
    expect(body.status).toBe(400);
    expect(body.detail).toBe('Validation failed');
    expect(body.fields).toEqual({ name: ['required'] });
  });

  it('returns 500 for non-HttpException errors', () => {
    const host = makeHost();
    const http = host.switchToHttp();
    const response = http.getResponse<{
      status: jest.Mock;
      setHeader: jest.Mock;
      json: jest.Mock;
    }>();

    filter.catch(new Error('unexpected'), host);

    const body = response.json.mock.calls[0][0];
    expect(body.status).toBe(500);
    expect(body.detail).toBe('An unexpected error occurred');
  });

  it('returns 500 for unknown exceptions', () => {
    const host = makeHost();
    const http = host.switchToHttp();
    const response = http.getResponse<{
      status: jest.Mock;
      setHeader: jest.Mock;
      json: jest.Mock;
    }>();

    filter.catch('some string error', host);

    const body = response.json.mock.calls[0][0];
    expect(body.status).toBe(500);
  });
});
