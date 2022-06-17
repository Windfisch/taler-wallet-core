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
import { AuthenticationEditorScreen as TestedComponent } from "./AuthenticationEditorScreen.js";

export default {
  component: TestedComponent,
  args: {
    order: 4,
  },
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
  },
};

export const InitialState = createExample(
  TestedComponent,
  reducerStatesExample.authEditing,
);
export const OneAuthMethodConfigured = createExample(TestedComponent, {
  ...reducerStatesExample.authEditing,
  authentication_methods: [
    {
      type: "question",
      instructions: "what time is it?",
      challenge: "asd",
    },
  ],
} as ReducerState);

export const SomeMoreAuthMethodConfigured = createExample(TestedComponent, {
  ...reducerStatesExample.authEditing,
  authentication_methods: [
    {
      type: "question",
      instructions: "what time is it?",
      challenge: "asd",
    },
    {
      type: "question",
      instructions: "what time is it?",
      challenge: "qwe",
    },
    {
      type: "sms",
      instructions: "what time is it?",
      challenge: "asd",
    },
    {
      type: "email",
      instructions: "what time is it?",
      challenge: "asd",
    },
    {
      type: "email",
      instructions: "what time is it?",
      challenge: "asd",
    },
    {
      type: "email",
      instructions: "what time is it?",
      challenge: "asd",
    },
    {
      type: "email",
      instructions: "what time is it?",
      challenge: "asd",
    },
  ],
} as ReducerState);

export const NoAuthMethodProvided = createExample(TestedComponent, {
  ...reducerStatesExample.authEditing,
  authentication_providers: {},
  authentication_methods: [],
} as ReducerState);
