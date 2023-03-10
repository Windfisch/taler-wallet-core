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
import { ReviewPoliciesScreen as TestedComponent } from "./ReviewPoliciesScreen.js";

export default {
  title: "Reviewing Policies",
  args: {
    order: 6,
  },
  component: TestedComponent,
  argTypes: {
    onUpdate: { action: "onUpdate" },
    onBack: { action: "onBack" },
  },
};

export const HasPoliciesButMethodListIsEmpty = createExample(TestedComponent, {
  ...reducerStatesExample.policyReview,
  policies: [
    {
      methods: [
        {
          authentication_method: 0,
          provider: "asd",
        },
        {
          authentication_method: 1,
          provider: "asd",
        },
      ],
    },
    {
      methods: [
        {
          authentication_method: 1,
          provider: "asd",
        },
      ],
    },
  ],
  authentication_methods: [],
} as ReducerState);

export const SomePoliciesWithMethods = createExample(TestedComponent, {
  ...reducerStatesExample.policyReview,
  policies: [
    {
      methods: [
        {
          authentication_method: 0,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 1,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 2,
          provider: "https://kudos.demo.anastasis.lu/",
        },
      ],
    },
    {
      methods: [
        {
          authentication_method: 0,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 1,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 3,
          provider: "https://anastasis.demo.taler.net/",
        },
      ],
    },
    {
      methods: [
        {
          authentication_method: 0,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 1,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 4,
          provider: "https://anastasis.demo.taler.net/",
        },
      ],
    },
    {
      methods: [
        {
          authentication_method: 0,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 2,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 3,
          provider: "https://anastasis.demo.taler.net/",
        },
      ],
    },
    {
      methods: [
        {
          authentication_method: 0,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 2,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 4,
          provider: "https://anastasis.demo.taler.net/",
        },
      ],
    },
    {
      methods: [
        {
          authentication_method: 0,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 3,
          provider: "https://anastasis.demo.taler.net/",
        },
        {
          authentication_method: 4,
          provider: "https://anastasis.demo.taler.net/",
        },
      ],
    },
    {
      methods: [
        {
          authentication_method: 1,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 2,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 3,
          provider: "https://anastasis.demo.taler.net/",
        },
      ],
    },
    {
      methods: [
        {
          authentication_method: 1,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 2,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 4,
          provider: "https://anastasis.demo.taler.net/",
        },
      ],
    },
    {
      methods: [
        {
          authentication_method: 1,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 3,
          provider: "https://anastasis.demo.taler.net/",
        },
        {
          authentication_method: 4,
          provider: "https://anastasis.demo.taler.net/",
        },
      ],
    },
    {
      methods: [
        {
          authentication_method: 2,
          provider: "https://kudos.demo.anastasis.lu/",
        },
        {
          authentication_method: 3,
          provider: "https://anastasis.demo.taler.net/",
        },
        {
          authentication_method: 4,
          provider: "https://anastasis.demo.taler.net/",
        },
      ],
    },
  ],
  authentication_methods: [
    {
      type: "email",
      instructions: "Email to qwe@asd.com",
      challenge: "E5VPA",
    },
    {
      type: "sms",
      instructions: "SMS to 555-555",
      challenge: "",
    },
    {
      type: "question",
      instructions: "Does P equal NP?",
      challenge: "C5SP8",
    },
    {
      type: "totp",
      instructions: "Response code for 'Anastasis'",
      challenge: "E5VPA",
    },
    {
      type: "sms",
      instructions: "SMS to 6666-6666",
      challenge: "",
    },
    {
      type: "question",
      instructions: "How did the chicken cross the road?",
      challenge: "C5SP8",
    },
  ],
} as ReducerState);
