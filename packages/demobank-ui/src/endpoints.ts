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
 */

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

export const TRANSACTION_API_EXAMPLE = {
  LIST_FIRST_PAGE: {
    method: "get" as const,
    url: "access-api/accounts/myAccount/transactions?page=0",
  },
  LIST_ERROR: {
    method: "get" as const,
    url: "access-api/accounts/myAccount/transactions?page=0",
    code: 500
  },
  LIST_NOT_FOUND: {
    method: "get" as const,
    url: "access-api/accounts/myAccount/transactions?page=0",
    code: 404
  }
}