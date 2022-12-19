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
declare module '*.po' {
  const content: any;
  export default content;
}
declare module 'jed' {
  const x: any;
  export = x;
}
declare module "*.jpeg" {
  const content: any;
  export default content;
}
declare module "*.png" {
  const content: any;
  export default content;
}
declare module '*.svg' {
  const content: any;
  export default content;
}

declare module '*.scss' {
  const content: Record<string, string>;
  export default content;
}
declare const __VERSION__: string;
declare const __GIT_HASH__: string;
