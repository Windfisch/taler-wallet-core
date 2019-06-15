
function structuredCloneImpl(val: any, visited: WeakMap<any, boolean>): any {
  // FIXME: replace with real implementation!
  return JSON.parse(JSON.stringify(val));
}

/**
 * Structured clone for IndexedDB.
 */
export function structuredClone(val: any): any {
  const visited: WeakMap<any, boolean> = new WeakMap<any, boolean>();
  return structuredCloneImpl(val, visited);
}

export default structuredClone;