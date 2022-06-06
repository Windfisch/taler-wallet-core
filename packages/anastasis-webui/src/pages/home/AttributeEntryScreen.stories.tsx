/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { ReducerState } from "@gnu-taler/anastasis-core";
import { createExample, reducerStatesExample } from "../../utils/index.js";
import { AttributeEntryScreen as TestedComponent } from "./AttributeEntryScreen.js";

export default {
  title: "Pages/PersonalInformation",
  component: TestedComponent,
  args: {
    order: 3,
  },
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
  },
};

export const Backup = createExample(TestedComponent, {
  ...reducerStatesExample.backupAttributeEditing,
  required_attributes: [
    {
      name: "full_name",
      label: "Full name",
      type: "string",
      uuid: "asdasdsa1",
      widget: "wid",
    },
    {
      name: "birthplace",
      label: "Birthplace",
      type: "string",
      uuid: "asdasdsa2",
      widget: "wid",
    },
    {
      name: "birthdate",
      label: "birthdate",
      type: "date",
      uuid: "asdasdsa3",
      widget: "calendar",
    },
  ],
} as ReducerState);

export const Recovery = createExample(TestedComponent, {
  ...reducerStatesExample.recoveryAttributeEditing,
  required_attributes: [
    {
      name: "full_name",
      label: "Full name",
      type: "string",
      uuid: "asdasdsa1",
      widget: "wid",
    },
    {
      name: "birthplace",
      label: "Birthplace",
      type: "string",
      uuid: "asdasdsa2",
      widget: "wid",
    },
    {
      name: "pepe2",
      label: "third",
      type: "date",
      uuid: "asdasdsa3",
      widget: "calendar",
    },
  ],
} as ReducerState);

export const WithNoRequiredAttribute = createExample(TestedComponent, {
  ...reducerStatesExample.backupAttributeEditing,
  required_attributes: undefined,
} as ReducerState);

const allWidgets = [
  "anastasis_gtk_ia_aadhar_in",
  "anastasis_gtk_ia_ahv",
  "anastasis_gtk_ia_birthdate",
  "anastasis_gtk_ia_birthnumber_cz",
  "anastasis_gtk_ia_birthnumber_sk",
  "anastasis_gtk_ia_birthplace",
  "anastasis_gtk_ia_cf_it",
  "anastasis_gtk_ia_cpr_dk",
  "anastasis_gtk_ia_es_dni",
  "anastasis_gtk_ia_es_ssn",
  "anastasis_gtk_ia_full_name",
  "anastasis_gtk_ia_my_jp",
  "anastasis_gtk_ia_nid_al",
  "anastasis_gtk_ia_nid_be",
  "anastasis_gtk_ia_ssn_de",
  "anastasis_gtk_ia_ssn_us",
  "anastasis_gtk_ia_tax_de",
  "anastasis_gtk_xx_prime",
  "anastasis_gtk_xx_square",
];

function typeForWidget(name: string): string {
  if (["anastasis_gtk_xx_prime", "anastasis_gtk_xx_square"].includes(name))
    return "number";
  if (["anastasis_gtk_ia_birthdate"].includes(name)) return "date";
  return "string";
}

export const WithAllPosibleWidget = createExample(TestedComponent, {
  ...reducerStatesExample.backupAttributeEditing,
  required_attributes: allWidgets.map((w) => ({
    name: w,
    label: `widget: ${w}`,
    type: typeForWidget(w),
    uuid: `uuid-${w}`,
    widget: w,
  })),
} as ReducerState);

export const WithAutocompleteFeature = createExample(TestedComponent, {
  ...reducerStatesExample.backupAttributeEditing,
  required_attributes: [
    {
      name: "ahv_number",
      label: "AHV Number",
      type: "string",
      uuid: "asdasdsa1",
      widget: "wid",
      "validation-regex":
        "^(756)\\.[0-9]{4}\\.[0-9]{4}\\.[0-9]{2}|(756)[0-9]{10}$",
      "validation-logic": "CH_AHV_check",
      autocomplete: "???.????.????.??",
    },
  ],
} as ReducerState);
