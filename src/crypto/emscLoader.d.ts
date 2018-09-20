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


declare function getLib(): Promise<{ lib: EmscLib }>;

/**
 * Signature of the function that retrieves emscripten
 * function implementations.
 */
export interface EmscFunGen {
  (name: string,
   ret: string,
   args: string[]): ((...x: Array<number|string>) => any);
  (name: string,
   ret: "number",
   args: string[]): ((...x: Array<number|string>) => number);
  (name: string,
   ret: "void",
   args: string[]): ((...x: Array<number|string>) => void);
  (name: string,
   ret: "string",
   args: string[]): ((...x: Array<number|string>) => string);
}


interface EmscLib {
  cwrap: EmscFunGen;

  ccall(name: string, ret: "number"|"string", argTypes: any[], args: any[]): any;

  stringToUTF8(s: string, addr: number, maxLength: number): void;

  onRuntimeInitialized(f: () => void): void;

  readBinary?: (filename: string) => Promise<ArrayBuffer>;

  calledRun?: boolean;

  _free(ptr: number): void;

  _malloc(n: number): number;

  Pointer_stringify(p: number, len?: number): string;

  getValue(ptr: number, type: string, noSafe?: boolean): number;

  setValue(ptr: number, value: number, type: string, noSafe?: boolean): void;

  writeStringToMemory(s: string, buffer: number, dontAddNull?: boolean): void;
}
