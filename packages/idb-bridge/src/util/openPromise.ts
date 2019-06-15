function openPromise<T>(): {
  promise: Promise<T>;
  resolve: (v?: T | PromiseLike<T>) => void;
  reject: (err?: any) => void;
} {
  let resolve;
  let reject;
  const promise = new Promise<T>((resolve2, reject2) => {
    resolve = resolve2;
    reject = reject2;
  });
  if (!resolve) {
    throw Error("broken invariant");
  }
  if (!reject) {
    throw Error("broken invariant");
  }

  return { promise, resolve, reject };
}

export default openPromise;
