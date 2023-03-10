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
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useAnastasisContext } from "../../context/anastasis.js";
import { AnastasisClientFrame, withProcessLabel } from "./index.js";

export function ContinentSelectionScreen(): VNode {
  const reducer = useAnastasisContext();

  // FIXME: remove this when #7056 is fixed
  const countryFromReducer =
    (reducer?.currentReducerState as any).selected_country || "";
  const [countryCode, setCountryCode] = useState(countryFromReducer);

  if (
    !reducer ||
    !reducer.currentReducerState ||
    !("continents" in reducer.currentReducerState)
  ) {
    return <div />;
  }
  const selectContinent = (continent: string): void => {
    reducer.transition("select_continent", { continent });
  };
  const selectCountry = (country: string): void => {
    setCountryCode(country);
  };

  const continentList = reducer.currentReducerState.continents || [];
  const countryList = reducer.currentReducerState.countries || [];
  const theContinent = reducer.currentReducerState.selected_continent || "";
  // const cc = reducer.currentReducerState.selected_country || "";
  const theCountry = countryList.find((c) => c.code === countryCode);
  const selectCountryAction = async () => {
    //selection should be when the select box changes it value
    if (!theCountry) return;
    reducer.transition("select_country", {
      country_code: countryCode,
    });
  };

  // const step1 = reducer.currentReducerState.backup_state === BackupStates.ContinentSelecting ||
  //   reducer.currentReducerState.recovery_state === RecoveryStates.ContinentSelecting;

  const errors = !theCountry ? "Select a country" : undefined;

  const handleBack = async () => {
    // We want to go to the start, even if we already selected
    // a country.
    // FIXME: What if we don't want to lose all information here?
    // Can we do some kind of soft reset?
    reducer.reset();
  };

  return (
    <AnastasisClientFrame
      hideNext={errors}
      title={withProcessLabel(reducer, "Where do you live?")}
      onNext={selectCountryAction}
      onBack={handleBack}
    >
      <div class="columns">
        <div class="column is-one-third">
          <div class="field">
            <label class="label">Continent</label>
            <div class="control is-expanded has-icons-left">
              <div class="select is-fullwidth">
                <select
                  onChange={(e) => selectContinent(e.currentTarget.value)}
                  value={theContinent}
                >
                  <option key="none" disabled selected value="">
                    {" "}
                    Choose a continent{" "}
                  </option>
                  {continentList.map((prov) => (
                    <option key={prov.name} value={prov.name}>
                      {prov.name}
                    </option>
                  ))}
                </select>
                <div class="icon is-small is-left">
                  <i class="mdi mdi-earth" />
                </div>
              </div>
            </div>
          </div>

          <div class="field">
            <label class="label">Country</label>
            <div class="control is-expanded has-icons-left">
              <div class="select is-fullwidth">
                <select
                  onChange={(e) => selectCountry((e.target as any).value)}
                  disabled={!theContinent}
                  value={theCountry?.code || ""}
                >
                  <option key="none" disabled selected value="">
                    {" "}
                    Choose a country{" "}
                  </option>
                  {countryList.map((prov) => (
                    <option key={prov.name} value={prov.code}>
                      {prov.name}
                    </option>
                  ))}
                </select>
                <div class="icon is-small is-left">
                  <i class="mdi mdi-earth" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="column is-two-third">
          <p>
            Your selection will help us ask right information to uniquely
            identify you when you want to recover your secret again.
          </p>
          <p>
            Choose the country that issued most of your long-term legal
            documents or personal identifiers.
          </p>
          {/* <div
            style={{
              border: "1px solid gray",
              borderRadius: "0.5em",
              backgroundColor: "#fbfcbd",
              padding: "0.5em",
            }}
          >
            <p>
              If you just want to try out Anastasis, we recommend that you
              choose <b>Testcontinent</b> with <b>Demoland</b>. For this special
              country, you will be asked for a simple number and not real,
              personal identifiable information.
            </p>
          </div> */}
        </div>
      </div>
    </AnastasisClientFrame>
  );
}
