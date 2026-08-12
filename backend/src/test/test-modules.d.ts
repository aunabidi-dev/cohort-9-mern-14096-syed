declare module 'mocha' {
  export interface Context {
    skip(): void;
    timeout(ms: number): void;
  }

  export function describe(name: string, fn: () => void): void;
  export function it(
    name: string,
    fn: (this: Context) => void | Promise<void>,
  ): void;
  export function before(fn: (this: Context) => void | Promise<void>): void;
  export function after(fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
}

declare module 'chai' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const expect: (value: unknown) => any;
}
