/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

export interface MemoEntry<T> {
  p: Promise<T>;
  t: number;
  n: number;
}

export class AsyncOpMemo<T> {
  private n = 0;
  private memo: { [k: string]: MemoEntry<T> } = {};
  put(key: string, p: Promise<T>): Promise<T> {
    const n = this.n++;
    this.memo[key] = {
      p,
      n,
      t: new Date().getTime(),
    };
    p.finally(() => {
      const r = this.memo[key];
      if (r && r.n === n) {
        delete this.memo[key];
      }
    });
    return p;
  }
  find(key: string): Promise<T> | undefined {
    const res = this.memo[key];
    const tNow = new Date().getTime();
    if (res && res.t < tNow - 10 * 1000) {
      delete this.memo[key];
      return;
    } else if (res) {
      return res.p;
    }
    return;
  }
}