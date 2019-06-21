import test from "ava";
import { getIndexKeys } from "./getIndexKeys";

test("basics", (t) => {
  t.deepEqual(getIndexKeys({foo: 42}, "foo", false), [42]);
  t.deepEqual(getIndexKeys({foo: {bar: 42}}, "foo.bar", false), [42]);
  t.deepEqual(getIndexKeys({foo: [42, 43]}, "foo.0", false), [42]);
  t.deepEqual(getIndexKeys({foo: [42, 43]}, "foo.1", false), [43]);

  t.deepEqual(getIndexKeys([1, 2, 3], "", false), [[1, 2, 3]]);

  t.throws(() => {
    getIndexKeys({foo: 42}, "foo.bar", false);
  });

  t.deepEqual(getIndexKeys({foo: 42}, "foo", true), [42]);
  t.deepEqual(getIndexKeys({foo: 42, bar: 10}, ["foo", "bar"], true), [42, 10]);
  t.deepEqual(getIndexKeys({foo: 42, bar: 10}, ["foo", "bar"], false), [[42, 10]]);
  t.deepEqual(getIndexKeys({foo: 42, bar: 10}, ["foo", "bar", "spam"], true), [42, 10]);

  t.throws(() => {
    getIndexKeys({foo: 42, bar: 10}, ["foo", "bar", "spam"], false);
  });
});
