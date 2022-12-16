/*
 This file is part of GNU Taler
 (C) 2021-2023 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

 /**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { AMOUNT_REGEX, PAYTO_REGEX } from "../../src/utils/constants.js";

describe('payto uri format', () => {
  const valids = [
    'payto://iban/DE75512108001245126199?amount=EUR:200.0&message=hello',
    'payto://ach/122000661/1234',
    'payto://upi/alice@example.com?receiver-name=Alice&amount=INR:200',
    'payto://void/?amount=EUR:10.5',
    'payto://ilp/g.acme.bob'
  ]
  
  test('should be valid', () => {
    valids.forEach(v => expect(v).toMatch(PAYTO_REGEX))
  });
  
  const invalids = [
    // has two question marks
    'payto://iban/DE75?512108001245126199?amount=EUR:200.0&message=hello',
    // has a space
    'payto://ach /122000661/1234',
    // has a space
    'payto://upi/alice@ example.com?receiver-name=Alice&amount=INR:200',
    // invalid field name (mount instead of amount)
    'payto://void/?mount=EUR:10.5',
    // payto:// is incomplete
    'payto: //ilp/g.acme.bob'
  ]
  
  test('should not be valid', () => {
    invalids.forEach(v => expect(v).not.toMatch(PAYTO_REGEX))
  });  
})

describe('amount format', () => {
  const valids = [
    'ARS:10',
    'COL:10.2',
    'UY:1,000.2',
    'ARS:10.123,123',
    'ARS:1,000,000',
    'ARSCOL:10',
    'THISISTHEMOTHERCOIN:1,000,000.123,123',
  ]
  
  test('should be valid', () => {
    valids.forEach(v => expect(v).toMatch(AMOUNT_REGEX))
  });
  
  const invalids = [
    //no currency name
    ':10',
    //use . instead of ,
    'ARS:1.000.000',
    //currency name with numbers
    '1ARS:10',
    //currency name with numbers
    'AR5:10',
    //missing value
    'USD:',
  ]
  
  test('should not be valid', () => {
    invalids.forEach(v => expect(v).not.toMatch(AMOUNT_REGEX))
  });  

})