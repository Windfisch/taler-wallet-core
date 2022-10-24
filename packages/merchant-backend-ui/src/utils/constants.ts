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

//https://tools.ietf.org/html/rfc8905
export const PAYTO_REGEX = /^payto:\/\/[a-zA-Z][a-zA-Z0-9-.]+(\/[a-zA-Z0-9\-\.\~\(\)@_%:!$&'*+,;=]*)*\??((amount|receiver-name|sender-name|instruction|message)=[a-zA-Z0-9\-\.\~\(\)@_%:!$'*+,;=]*&?)*$/
export const PAYTO_WIRE_METHOD_LOOKUP = /payto:\/\/([a-zA-Z][a-zA-Z0-9-.]+)\/.*/

export const AMOUNT_REGEX = /^[a-zA-Z][a-zA-Z]*:[0-9][0-9,]*\.?[0-9,]*$/

export const INSTANCE_ID_LOOKUP = /^\/instances\/([^/]*)\/?$/

export const AMOUNT_ZERO_REGEX = /^[a-zA-Z][a-zA-Z]*:0$/

export const CROCKFORD_BASE32_REGEX = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]+[*~$=U]*$/

export const URL_REGEX = /^((https?:)(\/\/\/?)([\w]*(?::[\w]*)?@)?([\d\w\.-]+)(?::(\d+))?)\/$/

// how much rows we add every time user hit load more
export const PAGE_SIZE = 20
// how bigger can be the result set
// after this threshold, load more with move the cursor
export const MAX_RESULT_SIZE = PAGE_SIZE * 2 - 1;

// how much we will wait for all request, in seconds
export const DEFAULT_REQUEST_TIMEOUT = 10;

export const MAX_IMAGE_SIZE = 1024 * 1024;

export const INSTANCE_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_.@-]+$/
