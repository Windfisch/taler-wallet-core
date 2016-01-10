
import * as Emsc from '../../lib/wallet/emscriptif';

export function declareTests(assert, context, it) {
  it("works!", function() {
    let x = new Emsc.Amount({value: 42, fraction:42, currency: "EUR"});
    let j = x.toJson();
    assert("value" in j);
  });
}