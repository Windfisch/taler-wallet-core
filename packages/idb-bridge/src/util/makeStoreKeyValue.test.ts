import test from 'ava';
import { makeStoreKeyValue } from "./makeStoreKeyValue";

test("basics", (t) => {
  let result;

  result = makeStoreKeyValue({ name: "Florian" }, undefined, 42, true, "id");
  t.is(result.updatedKeyGenerator, 43);
  t.is(result.key, 42);
  t.is(result.value.name, "Florian");
  t.is(result.value.id, 42);

  result = makeStoreKeyValue({ name: "Florian", id: 10 }, undefined, 5, true, "id");
  t.is(result.updatedKeyGenerator, 11);
  t.is(result.key, 10);
  t.is(result.value.name, "Florian");
  t.is(result.value.id, 10);

  result = makeStoreKeyValue({ name: "Florian", id: 5 }, undefined, 10, true, "id");
  t.is(result.updatedKeyGenerator, 10);
  t.is(result.key, 5);
  t.is(result.value.name, "Florian");
  t.is(result.value.id, 5);

  result = makeStoreKeyValue({ name: "Florian", id: "foo" }, undefined, 10, true, "id");
  t.is(result.updatedKeyGenerator, 10);
  t.is(result.key, "foo");
  t.is(result.value.name, "Florian");
  t.is(result.value.id, "foo");

  result = makeStoreKeyValue({ name: "Florian" }, "foo", 10, true, null);
  t.is(result.updatedKeyGenerator, 10);
  t.is(result.key, "foo");
  t.is(result.value.name, "Florian");
  t.is(result.value.id, undefined);

  result = makeStoreKeyValue({ name: "Florian" }, undefined, 10, true, null);
  t.is(result.updatedKeyGenerator, 11);
  t.is(result.key, 10);
  t.is(result.value.name, "Florian");
  t.is(result.value.id, undefined);
});
