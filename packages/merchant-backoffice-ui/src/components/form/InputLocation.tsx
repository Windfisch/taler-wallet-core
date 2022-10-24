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
import { Fragment, h } from "preact";
import { useTranslator } from "../../i18n";
import { Input } from "./Input";

export function InputLocation({name}:{name:string}) {
  const i18n = useTranslator()
  return <>
    <Input name={`${name}.country`} label={i18n`Country`} />
    <Input name={`${name}.address_lines`} inputType="multiline"
      label={i18n`Address`}
      toStr={(v: string[] | undefined) => !v ? '' : v.join('\n')}
      fromStr={(v: string) => v.split('\n')}
    />
    <Input name={`${name}.building_number`} label={i18n`Building number`} />
    <Input name={`${name}.building_name`} label={i18n`Building name`} />
    <Input name={`${name}.street`} label={i18n`Street`} />
    <Input name={`${name}.post_code`} label={i18n`Post code`} />
    <Input name={`${name}.town_location`} label={i18n`Town location`} />
    <Input name={`${name}.town`} label={i18n`Town`} />
    <Input name={`${name}.district`} label={i18n`District`} />
    <Input name={`${name}.country_subdivision`} label={i18n`Country subdivision`} />
  </>
}