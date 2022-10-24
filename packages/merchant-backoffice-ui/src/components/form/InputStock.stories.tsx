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

import { addDays } from "date-fns";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { FormProvider } from "./FormProvider";
import { InputStock, Stock } from "./InputStock";

export default {
  title: "Components/Form/InputStock",
  component: InputStock,
};

type T = { stock?: Stock };

export const CreateStockEmpty = () => {
  const [state, setState] = useState<Partial<T>>({});
  return (
    <FormProvider<T>
      name="product"
      object={state}
      errors={{}}
      valueHandler={setState}
    >
      <InputStock<T> name="stock" label="Stock" />
      <div>
        <pre>{JSON.stringify(state, undefined, 2)}</pre>
      </div>
    </FormProvider>
  );
};

export const CreateStockUnknownRestock = () => {
  const [state, setState] = useState<Partial<T>>({
    stock: {
      current: 10,
      lost: 0,
      sold: 0,
    },
  });
  return (
    <FormProvider<T>
      name="product"
      object={state}
      errors={{}}
      valueHandler={setState}
    >
      <InputStock<T> name="stock" label="Stock" />
      <div>
        <pre>{JSON.stringify(state, undefined, 2)}</pre>
      </div>
    </FormProvider>
  );
};

export const CreateStockNoRestock = () => {
  const [state, setState] = useState<Partial<T>>({
    stock: {
      current: 10,
      lost: 0,
      sold: 0,
      nextRestock: { t_s: "never" },
    },
  });
  return (
    <FormProvider<T>
      name="product"
      object={state}
      errors={{}}
      valueHandler={setState}
    >
      <InputStock<T> name="stock" label="Stock" />
      <div>
        <pre>{JSON.stringify(state, undefined, 2)}</pre>
      </div>
    </FormProvider>
  );
};

export const CreateStockWithRestock = () => {
  const [state, setState] = useState<Partial<T>>({
    stock: {
      current: 15,
      lost: 0,
      sold: 0,
      nextRestock: { t_s: addDays(new Date(), 1).getTime() / 1000 },
    },
  });
  return (
    <FormProvider<T>
      name="product"
      object={state}
      errors={{}}
      valueHandler={setState}
    >
      <InputStock<T> name="stock" label="Stock" />
      <div>
        <pre>{JSON.stringify(state, undefined, 2)}</pre>
      </div>
    </FormProvider>
  );
};

export const UpdatingProductWithManagedStock = () => {
  const [state, setState] = useState<Partial<T>>({
    stock: {
      current: 100,
      lost: 0,
      sold: 0,
      nextRestock: { t_s: addDays(new Date(), 1).getTime() / 1000 },
    },
  });
  return (
    <FormProvider<T>
      name="product"
      object={state}
      errors={{}}
      valueHandler={setState}
    >
      <InputStock<T> name="stock" label="Stock" alreadyExist />
      <div>
        <pre>{JSON.stringify(state, undefined, 2)}</pre>
      </div>
    </FormProvider>
  );
};

export const UpdatingProductWithInfiniteStock = () => {
  const [state, setState] = useState<Partial<T>>({});
  return (
    <FormProvider<T>
      name="product"
      object={state}
      errors={{}}
      valueHandler={setState}
    >
      <InputStock<T> name="stock" label="Stock" alreadyExist />
      <div>
        <pre>{JSON.stringify(state, undefined, 2)}</pre>
      </div>
    </FormProvider>
  );
};
