import { debug } from '../logging';

import { isArray, isObject, Obj } from './types';

export function deepGet(x: any, path: string[]): any {
  debug(`path: ${path}`);
  path = path.slice();
  debug(`path.slice: ${path.slice()}`);

  while (path.length > 0 && isObject(x)) {
    const key = path.shift()!;
    x = x[key];
  }
  debug(`path.length: ${path.length}`);
  debug(`x: ${x}`);
  return path.length === 0 ? x : undefined;
}

export function deepMerge(...objects: Array<Obj<any> | undefined>) {
  function mergeOne(target: Obj<any>, source: Obj<any>) {
    for (const key of Object.keys(source)) {
      const value = source[key];

      if (isObject(value)) {
        if (!isObject(target[key])) {
          target[key] = {};
        } // Overwrite on purpose
        mergeOne(target[key], value);
      } else if (typeof value !== 'undefined') {
        target[key] = value;
      }
    }
  }

  const others = objects.filter(x => x != null) as Array<Obj<any>>;

  if (others.length === 0) {
    return {};
  }
  const into = others.splice(0, 1)[0];

  others.forEach(other => mergeOne(into, other));
  return into;
}

export function makeObject<T>(pairs: Array<[string, T]>): Obj<T> {
  const ret: Obj<T> = {};
  for (const pair of pairs) {
    ret[pair[0]] = pair[1];
  }
  return ret;
}

export function mapObject<T, U>(
  x: Obj<T>,
  fn: (key: string, value: T) => U,
): U[] {
  const ret: U[] = [];
  Object.keys(x).forEach(key => {
    ret.push(fn(key, x[key]));
  });
  return ret;
}

export function deepClone(x: any): any {
  if (typeof x === 'undefined') {
    return undefined;
  }
  if (x === null) {
    return null;
  }
  if (isArray(x)) {
    return x.map(deepClone);
  }
  if (isObject(x)) {
    return makeObject(
      mapObject(x, (k, v) => [k, deepClone(v)] as [string, any]),
    );
  }
  return x;
}
