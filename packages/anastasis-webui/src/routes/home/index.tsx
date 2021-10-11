import { FunctionalComponent, h } from "preact";
import { useState } from "preact/hooks";
import {
  AnastasisReducerApi,
  useAnastasisReducer,
} from "../../hooks/use-anastasis-reducer";
import style from "./style.css";

const Home: FunctionalComponent = () => {
  const reducer = useAnastasisReducer();
  if (!reducer.currentReducerState) {
    return (
      <div class={style.home}>
        <h1>Home</h1>
        <p>
          <button onClick={() => reducer.startBackup()}>Backup</button>
          <button>Recover</button>
        </p>
      </div>
    );
  }
  console.log("state", reducer.currentReducerState);
  if (reducer.currentReducerState.backup_state === "CONTINENT_SELECTING") {
    return (
      <div class={style.home}>
        <h1>Backup: Select Continent</h1>
        <ErrorBanner reducer={reducer} />
        <div>
          {reducer.currentReducerState.continents.map((x: any) => {
            const sel = (x: string) =>
              reducer.transition("select_continent", { continent: x });
            return (
              <button onClick={() => sel(x.name)} key={x.name}>
                {x.name}
              </button>
            );
          })}
        </div>
        <div>
          <button onClick={() => reducer.back()}>Back</button>
        </div>
      </div>
    );
  }
  if (reducer.currentReducerState.backup_state === "COUNTRY_SELECTING") {
    return (
      <div class={style.home}>
        <h1>Backup: Select Continent</h1>
        <ErrorBanner reducer={reducer} />
        <div>
          {reducer.currentReducerState.countries.map((x: any) => {
            const sel = (x: any) =>
              reducer.transition("select_country", {
                country_code: x.code,
                currencies: [x.currency],
              });
            return (
              <button onClick={() => sel(x)} key={x.name}>
                {x.name} ({x.currency})
              </button>
            );
          })}
        </div>
        <div>
          <button onClick={() => reducer.back()}>Back</button>
        </div>
      </div>
    );
  }
  if (
    reducer.currentReducerState.backup_state === "USER_ATTRIBUTES_COLLECTING"
  ) {
    return <AttributeEntry reducer={reducer} />;
  }

  if (reducer.currentReducerState.backup_state === "AUTHENTICATIONS_EDITING") {
    return <AuthenticationEditor reducer={reducer} />;
  }

  console.log("unknown state", reducer.currentReducerState);
  return (
    <div class={style.home}>
      <h1>Home</h1>
      <p>Bug: Unknown state.</p>
    </div>
  );
};

export interface AuthenticationEditorProps {
  reducer: AnastasisReducerApi;
}

function AuthenticationEditor(props: AuthenticationEditorProps) {
  const { reducer } = props;
  const providers = reducer.currentReducerState.authentication_providers;
  const authAvailable = new Set<string>();
  for (const provKey of Object.keys(providers)) {
    const p = providers[provKey];
    for (const meth of p.methods) {
      authAvailable.add(meth.type);
    }
  }
  return (
    <div class={style.home}>
      <h1>Backup: Configure Authentication Methods</h1>
      <p>Auths available: {JSON.stringify(Array.from(authAvailable))}</p>
      <button>Next</button>
      <div>
        <button onClick={() => reducer.back()}>Back</button>
      </div>
    </div>
  );
}

export interface AttributeEntryProps {
  reducer: AnastasisReducerApi;
}

function AttributeEntry(props: AttributeEntryProps) {
  const reducer = props.reducer;
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  return (
    <div class={style.home}>
      <h1>Backup: Enter Basic User Attributes</h1>
      <ErrorBanner reducer={reducer} />
      <div>
        {reducer.currentReducerState.required_attributes.map((x: any) => {
          return (
            <AttributeEntryField
              setValue={(v: string) => setAttrs({ ...attrs, [x.name]: v })}
              spec={x}
              value={attrs[x.name]}
            />
          );
        })}
      </div>
      <button
        onClick={() =>
          reducer.transition("enter_user_attributes", {
            identity_attributes: attrs,
          })
        }
      >
        Next
      </button>
      <div>
        <button onClick={() => reducer.back()}>Back</button>
      </div>
    </div>
  );
}

export interface AttributeEntryFieldProps {
  value: string;
  setValue: (newValue: string) => void;
  spec: any;
}

function AttributeEntryField(props: AttributeEntryFieldProps) {
  return (
    <div>
      <label>{props.spec.label}</label>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.setValue((e as any).target.value)}
      />
    </div>
  );
}

interface ErrorBannerProps {
  reducer: AnastasisReducerApi;
}

/**
 * Show a dismissable error banner if there is a current error.
 */
function ErrorBanner(props: ErrorBannerProps) {
  const currentError = props.reducer.currentError;
  if (currentError) {
    return <div>Error: {JSON.stringify(currentError)}</div>;
  }
  return null;
}

export default Home;
