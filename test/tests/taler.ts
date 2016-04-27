import * as Emsc from '../../lib/wallet/emscriptif';


declare var HttpMockLib;

export function declareTests(assert, context, it) {

  it("calls native emscripten code", function() {
    let x = new Emsc.Amount({value: 42, fraction: 42, currency: "EUR"});
    let j = x.toJson();
    assert("value" in j);
  });
}
