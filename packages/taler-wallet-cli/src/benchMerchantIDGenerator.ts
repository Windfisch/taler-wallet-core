/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 
 @author: Boss Marco
 */

const getRandomInt = function(max: number) {
  return Math.floor(Math.random() * max);
}

abstract class BenchMerchantIDGenerator {
  abstract getRandomMerchantID(): number
}

class ZipfGenerator extends BenchMerchantIDGenerator {

  weights: number[];
  total_weight: number;

  constructor(numMerchants: number) {
    super();
    this.weights = new Array<number>(numMerchants);
    for (var i = 0; i < this.weights.length; i++) {
      /* we use integers (floor), make sure we have big enough values 
       * by multiplying with
       * numMerchants again */
      this.weights[i] = Math.floor((numMerchants/(i+1)) * numMerchants);
    }
    this.total_weight = this.weights.reduce((p, n) => p + n);
  }

  getRandomMerchantID(): number {
    let random = getRandomInt(this.total_weight);
    let current = 0;

    for (var i = 0; i < this.weights.length; i++) {
      current += this.weights[i];
      if (random <= current) {
          return i+1;
      }
    }

    /* should never come here */
    return getRandomInt(this.weights.length);
  }
}

class RandomGenerator extends BenchMerchantIDGenerator {

  max: number

  constructor(numMerchants: number) {
    super();
    this.max = numMerchants
  }

  getRandomMerchantID() {
    return getRandomInt(this.max);
  }
}

export default function(type: string, maxID: number): BenchMerchantIDGenerator {
  switch (type) {
    case "zipf":
      return new ZipfGenerator(maxID);
    case "rand":
      return new RandomGenerator(maxID);
    default:
      throw new Error("Valid types are 'zipf' and 'rand'");
  }
}
