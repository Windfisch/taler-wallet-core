import {test} from "ava";
import * as helpers from "./helpers";


test("URL canonicalization", t => {
  // converts to relative, adds https
  t.is(
    "https://alice.example.com/exchange/",
    helpers.canonicalizeBaseUrl("alice.example.com/exchange"));

  // keeps http, adds trailing slash
  t.is(
    "http://alice.example.com/exchange/",
    helpers.canonicalizeBaseUrl("http://alice.example.com/exchange"));

  // keeps http, adds trailing slash
  t.is(
    "http://alice.example.com/exchange/",
    helpers.canonicalizeBaseUrl("http://alice.example.com/exchange#foobar"));
  t.pass();
});
