export type Obj<T> = { [key: string]: T };

export const isArray = Array.isArray;

export function isObject(x: any): x is Obj<any> {
  return x !== null && typeof x === 'object' && !isArray(x);
}

export function ifDefined<T>(x: T | undefined, def: T): T {
  return typeof x !== 'undefined' ? x : def;
}
