/*
 This file is part of GNU Taler
 (C) 2018 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const denoms = [512, 256, 128, 64, 32, 16, 8, 4, 2, 1];

// mapping from denomination index to count
const wallet = denoms.map(() => 0);

const trans_max = 1000;
const trans_min = 2;

const withdraw_max = 5000;

const num_transactions = parseInt(process.argv[2]);

// Refresh or withdraw operations
let ops = 0;

function withdraw(amount) {
  while (amount != 0) {
    for (let i = 0; i < denoms.length; i++) {
      let d = denoms[i];
      if (d <= amount) {
        amount -= d;
        wallet[i]++;
        ops++;
        break;
      }
    }
  }
}

function spendSmallestFirst(cost) {
  while (cost != 0) {
    for (let j = 0; j < denoms.length; j++) {
      const k = denoms.length - j - 1;
      const d = denoms[k];
      const w = wallet[k];
      if (w == 0) {
        continue;
      }
      if (d <= cost) {
        // spend
        wallet[k]--;
        cost -= d;
        ops++;
        break;
      }
      // partially spend and then refresh
      ops++;
      let r = d - cost;
      wallet[k]--;
      withdraw(r);
      cost = 0;
    }
  }
}

function spendLargestFirst(cost) {
  while (cost != 0) {
    for (let j = 0; j < denoms.length; j++) {
      const d = denoms[j];
      const w = wallet[j];
      if (w == 0) {
        continue;
      }
      if (d <= cost) {
        // spend
        wallet[j]--;
        cost -= d;
        ops++;
        break;
      }
      // partially spend and then refresh
      ops++;
      let r = d - cost;
      wallet[j]--;
      withdraw(r);
      cost = 0;
    }
  }
}

function spendHybrid(cost) {
    for (let j = 0; j < denoms.length; j++) {
      const k = denoms.length - j - 1;
      const d = denoms[k];
      const w = wallet[k];
      if (w == 0) {
        continue;
      }
      if (d < cost) {
        continue;
      }
      // partially spend and then refresh
      ops++;
      let r = d - cost;
      wallet[k]--;
      withdraw(r);
      cost = 0;
    }

  spendSmallestFirst(cost);
}

for (let i = 0; i < num_transactions; i++) {
  // check existing wallet balance
  let balance = 0;
  for (let j = 0; j < denoms.length; j++) {
    balance += wallet[j] * denoms[j]
  }
  // choose how much we want to spend
  let cost = getRandomInt(trans_min, trans_max);
  if (balance < cost) {
    // we need to withdraw
    let amount = getRandomInt(cost - balance, withdraw_max);
    withdraw(amount);
  }

  // check that we now have enough balance
  balance = 0;
  for (let j = 0; j < denoms.length; j++) {
    balance += wallet[j] * denoms[j]
  }

  if (balance < cost) {
    throw Error("not enough balance");
  }

  // now we spend
  spendHybrid(cost);
}

console.log(ops / num_transactions);
