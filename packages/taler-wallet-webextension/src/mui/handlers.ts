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
import { TalerError } from "@gnu-taler/taler-wallet-core";

export interface TextFieldHandler {
  onInput: (value: string) => Promise<void>;
  value: string;
  error?: string;
}

export interface ButtonHandler {
  onClick?: () => Promise<void>;
  error?: TalerError;
}

export interface ToggleHandler {
  value?: boolean;
  button: ButtonHandler;
}

export interface SelectFieldHandler {
  onChange?: (value: string) => Promise<void>;
  error?: string;
  value: string;
  isDirty?: boolean;
  list: Record<string, string>;
}
