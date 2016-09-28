/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

export interface EmscFunGen {
  (name: string,
   ret: string,
   args: string[]): ((...x: (number|string)[]) => any);
  (name: string,
   ret: "number",
   args: string[]): ((...x: (number|string)[]) => number);
  (name: string,
   ret: "void",
   args: string[]): ((...x: (number|string)[]) => void);
  (name: string,
   ret: "string",
   args: string[]): ((...x: (number|string)[]) => string);
}


export declare namespace Module {
  var cwrap: EmscFunGen;

  function stringToUTF8(s: string, addr: number, maxLength: number): void

  function _free(ptr: number): void;

  function _malloc(n: number): number;

  function Pointer_stringify(p: number, len?: number): string;

  function getValue(ptr: number, type: string, noSafe?: boolean): number;

  function setValue(ptr: number, value: number, type: string,
                    noSafe?: boolean): void;

  function writeStringToMemory(s: string,
                               buffer: number,
                               dontAddNull?: boolean): void;
}