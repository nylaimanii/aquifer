/** Shared float comparison for the engine .test.ts assert suites. */
export const close = (a: number, b: number, tol: number): boolean =>
  Math.abs(a - b) <= tol;
