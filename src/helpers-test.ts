import {test, TestLib} from "talertest";
import * as helpers from "./helpers";


test("URL canonicalization", (t: TestLib) => {
  // converts to relative, adds https
  t.assertEqualsStrict(
    "https://alice.example.com/exchange/",
    helpers.canonicalizeBaseUrl("alice.example.com/exchange"))

  // keeps http, adds trailing slash
  t.assertEqualsStrict(
    "http://alice.example.com/exchange/",
    helpers.canonicalizeBaseUrl("http://alice.example.com/exchange"))

  // keeps http, adds trailing slash
  t.assertEqualsStrict(
    "http://alice.example.com/exchange/",
    helpers.canonicalizeBaseUrl("http://alice.example.com/exchange#foobar"))
  t.pass();
});
