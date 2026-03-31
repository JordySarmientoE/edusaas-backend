import { ExecutionContext } from '@nestjs/common';

type RequestLike = Record<string, unknown>;

export function createMockExecutionContext(options?: {
  request?: RequestLike;
  handler?: object;
  classRef?: object;
}): ExecutionContext {
  const request = options?.request ?? {};
  const handler = options?.handler ?? (() => undefined);
  const classRef = options?.classRef ?? class TestController {}

  return {
    switchToHttp: () => ({
      getRequest: () => request
    }),
    getHandler: () => handler,
    getClass: () => classRef
  } as ExecutionContext;
}
