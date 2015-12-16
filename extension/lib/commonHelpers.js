"use strict";

Handlebars.registerHelper('prettyAmount', function (amount) {
    let v = amount.value + amount.fraction / 10e6;
    return v.toFixed(2) + " " + amount.currency;
});

Handlebars.registerHelper('prettyAmountNoCurrency', function (amount) {
    let v = amount.value + amount.fraction / 10e6;
    return v.toFixed(2);
});

Handlebars.registerHelper('objectStringifier', function (o) {
  return JSON.stringify(o);
});
