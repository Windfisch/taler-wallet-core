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

import {
  KnownBankAccountsInfo,
  PaytoUriBitcoin,
  PaytoUriIBAN,
  PaytoUriTalerBank,
} from "@gnu-taler/taler-util";
import { styled } from "@linaria/react";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { ErrorMessage } from "../../components/ErrorMessage.js";
import { LoadingError } from "../../components/LoadingError.js";
import { SelectList } from "../../components/SelectList.js";
import {
  Input,
  LightText,
  SubTitle,
  SvgIcon,
  WarningText,
} from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import { TextFieldHandler } from "../../mui/handlers.js";
import { TextField } from "../../mui/TextField.js";
import checkIcon from "../../svg/check_24px.svg";
import warningIcon from "../../svg/warning_24px.svg";
import deleteIcon from "../../svg/delete_24px.svg";
import { State } from "./index.js";

type AccountType = "bitcoin" | "x-taler-bank" | "iban";
type ComponentFormByAccountType = {
  [type in AccountType]: (props: { field: TextFieldHandler }) => VNode;
};

type ComponentListByAccountType = {
  [type in AccountType]: (props: {
    list: KnownBankAccountsInfo[];
    onDelete: (a: KnownBankAccountsInfo) => Promise<void>;
  }) => VNode;
};

const formComponentByAccountType: ComponentFormByAccountType = {
  iban: IbanAddressAccount,
  bitcoin: BitcoinAddressAccount,
  "x-taler-bank": TalerBankAddressAccount,
};
const tableComponentByAccountType: ComponentListByAccountType = {
  iban: IbanTable,
  bitcoin: BitcoinTable,
  "x-taler-bank": TalerBankTable,
};

const AccountTable = styled.table`
  width: 100%;

  border-collapse: separate;
  border-spacing: 0px 10px;
  tbody tr:nth-child(odd) > td:not(.actions, .kyc) {
    background-color: lightgrey;
  }
  .actions,
  .kyc {
    width: 10px;
    background-color: inherit;
  }
`;

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load</i18n.Translate>}
      error={error}
    />
  );
}

export function ReadyView({
  currency,
  error,
  accountType,
  accountByType,
  alias,
  onAccountAdded,
  deleteAccount,
  onCancel,
  uri,
}: State.Ready): VNode {
  const { i18n } = useTranslationContext();

  return (
    <Fragment>
      <section>
        <SubTitle>
          <i18n.Translate>Known accounts for {currency}</i18n.Translate>
        </SubTitle>
        <p>
          <i18n.Translate>
            To add a new account first select the account type.
          </i18n.Translate>
        </p>

        {error && (
          <ErrorMessage
            title={<i18n.Translate>Unable add this account</i18n.Translate>}
            description={error}
          />
        )}
        <p>
          <Input>
            <SelectList
              label={<i18n.Translate>Select account type</i18n.Translate>}
              list={accountType.list}
              name="accountType"
              value={accountType.value}
              onChange={accountType.onChange}
            />
          </Input>
        </p>
        {accountType.value === "" ? undefined : (
          <Fragment>
            <p>
              <CustomFieldByAccountType
                type={accountType.value as AccountType}
                field={uri}
              />
            </p>
            <p>
              <TextField
                label="Account alias"
                variant="standard"
                required
                fullWidth
                disabled={accountType.value === ""}
                value={alias.value}
                onChange={alias.onInput}
              />
            </p>
          </Fragment>
        )}
      </section>
      <section>
        <Button
          variant="contained"
          color="secondary"
          onClick={onCancel.onClick}
        >
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        <Button
          variant="contained"
          onClick={onAccountAdded.onClick}
          disabled={!onAccountAdded.onClick}
        >
          <i18n.Translate>Add</i18n.Translate>
        </Button>
      </section>
      <section>
        {Object.entries(accountByType).map(([type, list]) => {
          const Table = tableComponentByAccountType[type as AccountType];
          return <Table key={type} list={list} onDelete={deleteAccount} />;
        })}
      </section>
    </Fragment>
  );
}

function IbanTable({
  list,
  onDelete,
}: {
  list: KnownBankAccountsInfo[];
  onDelete: (ac: KnownBankAccountsInfo) => void;
}): VNode {
  const { i18n } = useTranslationContext();
  if (list.length === 0) return <Fragment />;
  return (
    <div>
      <h1>
        <i18n.Translate>IBAN accounts</i18n.Translate>
      </h1>
      <AccountTable>
        <thead>
          <tr>
            <th>
              <i18n.Translate>Alias</i18n.Translate>
            </th>
            <th>
              <i18n.Translate>Int. Account Number</i18n.Translate>
            </th>
            <th>
              <i18n.Translate>Account name</i18n.Translate>
            </th>
            <th class="kyc">
              <i18n.Translate>KYC</i18n.Translate>
            </th>
            <th class="actions"></th>
          </tr>
        </thead>
        <tbody>
          {list.map((account) => {
            const p = account.uri as PaytoUriIBAN;
            return (
              <tr key={account.alias}>
                <td>{account.alias}</td>
                <td>{p.targetPath}</td>
                <td>{p.params["receiver-name"]}</td>
                <td class="kyc">
                  {account.kyc_completed ? (
                    <SvgIcon
                      title={i18n.str`KYC done`}
                      dangerouslySetInnerHTML={{ __html: checkIcon }}
                      color="green"
                    />
                  ) : (
                    <SvgIcon
                      title={i18n.str`KYC missing`}
                      dangerouslySetInnerHTML={{ __html: warningIcon }}
                      color="orange"
                    />
                  )}
                </td>
                <td class="actions">
                  <Button
                    variant="outlined"
                    startIcon={deleteIcon}
                    size="small"
                    onClick={async () => onDelete(account)}
                    color="error"
                  >
                    Forget
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </AccountTable>
    </div>
  );
}

function TalerBankTable({
  list,
  onDelete,
}: {
  list: KnownBankAccountsInfo[];
  onDelete: (ac: KnownBankAccountsInfo) => void;
}): VNode {
  const { i18n } = useTranslationContext();
  if (list.length === 0) return <Fragment />;
  return (
    <div>
      <h1>
        <i18n.Translate>Taler accounts</i18n.Translate>
      </h1>
      <AccountTable>
        <thead>
          <tr>
            <th>
              <i18n.Translate>Alias</i18n.Translate>
            </th>
            <th>
              <i18n.Translate>Host</i18n.Translate>
            </th>
            <th>
              <i18n.Translate>Account</i18n.Translate>
            </th>
            <th class="kyc">
              <i18n.Translate>KYC</i18n.Translate>
            </th>
            <th class="actions"></th>
          </tr>
        </thead>
        <tbody>
          {list.map((account) => {
            const p = account.uri as PaytoUriTalerBank;
            return (
              <tr key={account.alias}>
                <td>{account.alias}</td>
                <td>{p.host}</td>
                <td>{p.account}</td>
                <td class="kyc">
                  {account.kyc_completed ? (
                    <SvgIcon
                      title={i18n.str`KYC done`}
                      dangerouslySetInnerHTML={{ __html: checkIcon }}
                      color="green"
                    />
                  ) : (
                    <SvgIcon
                      title={i18n.str`KYC missing`}
                      dangerouslySetInnerHTML={{ __html: warningIcon }}
                      color="orange"
                    />
                  )}
                </td>
                <td class="actions">
                  <Button
                    variant="outlined"
                    startIcon={deleteIcon}
                    size="small"
                    onClick={async () => onDelete(account)}
                    color="error"
                  >
                    Forget
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </AccountTable>
    </div>
  );
}

function BitcoinTable({
  list,
  onDelete,
}: {
  list: KnownBankAccountsInfo[];
  onDelete: (ac: KnownBankAccountsInfo) => void;
}): VNode {
  const { i18n } = useTranslationContext();
  if (list.length === 0) return <Fragment />;
  return (
    <div>
      <h2>
        <i18n.Translate>Bitcoin accounts</i18n.Translate>
      </h2>
      <AccountTable>
        <thead>
          <tr>
            <th>
              <i18n.Translate>Alias</i18n.Translate>
            </th>
            <th>
              <i18n.Translate>Address</i18n.Translate>
            </th>
            <th class="kyc">
              <i18n.Translate>KYC</i18n.Translate>
            </th>
            <th class="actions"></th>
          </tr>
        </thead>
        <tbody>
          {list.map((account) => {
            const p = account.uri as PaytoUriBitcoin;
            return (
              <tr key={account.alias}>
                <td>{account.alias}</td>
                <td>{p.targetPath}</td>
                <td class="kyc">
                  {account.kyc_completed ? (
                    <SvgIcon
                      title={i18n.str`KYC done`}
                      dangerouslySetInnerHTML={{ __html: checkIcon }}
                      color="green"
                    />
                  ) : (
                    <SvgIcon
                      title={i18n.str`KYC missing`}
                      dangerouslySetInnerHTML={{ __html: warningIcon }}
                      color="orange"
                    />
                  )}
                </td>
                <td class="actions">
                  <Button
                    variant="outlined"
                    startIcon={deleteIcon}
                    size="small"
                    onClick={async () => onDelete(account)}
                    color="error"
                  >
                    Forget
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </AccountTable>
    </div>
  );
}

function BitcoinAddressAccount({ field }: { field: TextFieldHandler }): VNode {
  const { i18n } = useTranslationContext();
  const [value, setValue] = useState<string | undefined>(undefined);
  const errors = undefinedIfEmpty({
    value: !value ? i18n.str`Can't be empty` : undefined,
  });
  return (
    <Fragment>
      <TextField
        label="Bitcoin address"
        variant="standard"
        fullWidth
        value={value}
        error={value !== undefined && !!errors?.value}
        disabled={!field.onInput}
        onChange={(v) => {
          setValue(v);
          if (!errors && field.onInput) {
            field.onInput(`payto://bitcoin/${v}`);
          }
        }}
      />
      {value !== undefined && errors?.value && (
        <ErrorMessage title={<span>{errors?.value}</span>} />
      )}
    </Fragment>
  );
}

function undefinedIfEmpty<T extends object>(obj: T): T | undefined {
  return Object.keys(obj).some((k) => (obj as any)[k] !== undefined)
    ? obj
    : undefined;
}

function TalerBankAddressAccount({
  field,
}: {
  field: TextFieldHandler;
}): VNode {
  const { i18n } = useTranslationContext();
  const [host, setHost] = useState<string | undefined>(undefined);
  const [account, setAccount] = useState<string | undefined>(undefined);
  const errors = undefinedIfEmpty({
    host: !host ? i18n.str`Can't be empty` : undefined,
    account: !account ? i18n.str`Can't be empty` : undefined,
  });
  return (
    <Fragment>
      <TextField
        label="Bank host"
        variant="standard"
        fullWidth
        value={host}
        error={host !== undefined && !!errors?.host}
        disabled={!field.onInput}
        onChange={(v) => {
          setHost(v);
          if (!errors && field.onInput) {
            field.onInput(`payto://x-taler-bank/${v}/${account}`);
          }
        }}
      />{" "}
      {host !== undefined && errors?.host && (
        <ErrorMessage title={<span>{errors?.host}</span>} />
      )}
      <TextField
        label="Bank account"
        variant="standard"
        fullWidth
        disabled={!field.onInput}
        value={account}
        error={account !== undefined && !!errors?.account}
        onChange={(v) => {
          setAccount(v || "");
          if (!errors && field.onInput) {
            field.onInput(`payto://x-taler-bank/${host}/${v}`);
          }
        }}
      />{" "}
      {account !== undefined && errors?.account && (
        <ErrorMessage title={<span>{errors?.account}</span>} />
      )}
    </Fragment>
  );
}

function IbanAddressAccount({ field }: { field: TextFieldHandler }): VNode {
  const { i18n } = useTranslationContext();
  const [number, setNumber] = useState<string | undefined>(undefined);
  const [name, setName] = useState<string | undefined>(undefined);
  const errors = undefinedIfEmpty({
    number: !number ? i18n.str`Can't be empty` : undefined,
    name: !name ? i18n.str`Can't be empty` : undefined,
  });
  return (
    <Fragment>
      <TextField
        label="IBAN number"
        variant="standard"
        fullWidth
        value={number}
        error={number !== undefined && !!errors?.number}
        disabled={!field.onInput}
        onChange={(v) => {
          setNumber(v);
          if (!errors && field.onInput) {
            field.onInput(`payto://iban/${v}?receiver-name=${name}`);
          }
        }}
      />
      {number !== undefined && errors?.number && (
        <ErrorMessage title={<span>{errors?.number}</span>} />
      )}
      <TextField
        label="Account name"
        variant="standard"
        fullWidth
        value={name}
        error={name !== undefined && !!errors?.name}
        disabled={!field.onInput}
        onChange={(v) => {
          setName(v);
          if (!errors && field.onInput) {
            field.onInput(
              `payto://iban/${number}?receiver-name=${encodeURIComponent(v)}`,
            );
          }
        }}
      />
      {name !== undefined && errors?.name && (
        <ErrorMessage title={<span>{errors?.name}</span>} />
      )}
    </Fragment>
  );
}

function CustomFieldByAccountType({
  type,
  field,
}: {
  type: AccountType;
  field: TextFieldHandler;
}): VNode {
  const { i18n } = useTranslationContext();

  const AccountForm = formComponentByAccountType[type];

  return (
    <div>
      <WarningText>
        <i18n.Translate>
          We can not validate the account so make sure the value is correct.
        </i18n.Translate>
      </WarningText>
      <AccountForm field={field} />
    </div>
  );
}
