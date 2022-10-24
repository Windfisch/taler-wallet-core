/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

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
import * as axios from 'axios';

type Query<Req, Res> = (GetQuery | PostQuery | DeleteQuery | PatchQuery) & RequestResponse<Req, Res>

interface RequestResponse<Req, Res> {
  request?: Req,
  params?: any,
  response?: Res,
}
interface GetQuery { get: string }
interface PostQuery { post: string }
interface DeleteQuery { delete: string }
interface PatchQuery { patch: string }

export function simulateBackendResponse<R, T>(query: Query<R, T>): void {
  (axios.default as jest.MockedFunction<axios.AxiosStatic>).mockImplementationOnce(function (opt?: axios.AxiosRequestConfig): axios.AxiosPromise {
      // console.log(opt, JSON.stringify(query,undefined,2))
      expect(opt).toBeDefined();
      if (!opt)
        return Promise.reject();

      // expect(query.request).toStrictEqual(opt.data);
      // expect(query.params).toStrictEqual(opt.params);
      if ('get' in query) {
        expect(opt.method).toBe('get');
        expect(opt.url).toBe(query.get);
      }
      if ('post' in query) {
        expect(opt.method).toBe('post');
        expect(opt.url).toBe(query.post);
      }
      if ('delete' in query) {
        expect(opt.method).toBe('delete');
        expect(opt.url).toBe(query.delete);
      }
      if ('patch' in query) {
        expect(opt.method).toBe('patch');
        expect(opt.url).toBe(query.patch);
      }
      return ({ data: query.response, config: {} } as any);
    } as any)
}
