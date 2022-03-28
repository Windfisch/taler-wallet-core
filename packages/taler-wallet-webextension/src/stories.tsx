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
import { setupI18n } from "@gnu-taler/taler-util";
import { styled } from "@linaria/react";
import {
  ComponentChild,
  ComponentProps,
  Fragment,
  FunctionComponent,
  h,
  render,
  VNode,
} from "preact";
import { useEffect, useErrorBoundary, useState } from "preact/hooks";
import { LogoHeader } from "./components/LogoHeader";
import { PopupBox, WalletBox } from "./components/styled";
import * as mui from "./mui/index.stories";
import { PopupNavBar, WalletNavBar } from "./NavigationBar";
import * as popup from "./popup/index.stories";
import * as wallet from "./wallet/index.stories";

setupI18n("en", { en: {} });

const Page = styled.div`
  * {
    margin: 0px;
    padding: 0px;
    font-size: 100%;
    font-family: Arial, Helvetica, sans-serif;
  }
  p:not([class]) {
    margin-bottom: 1em;
    margin-top: 1em;
  }
  width: 100%;
  display: flex;
  flex-direction: row;
`;

const SideBar = styled.div`
  min-width: 200px;
  height: calc(100vh - 20px);
  overflow-y: visible;
  overflow-x: hidden;
  & > {
    ol {
      padding: 4px;
      div {
        background-color: lightcoral;
        cursor: pointer;
      }
      dd {
        margin-left: 1em;
        padding: 4px;
        cursor: pointer;
        border-radius: 4px;
        margin-bottom: 4px;
      }
      dd:nth-child(even) {
        background-color: lightgray;
      }
      dd:nth-child(odd) {
        background-color: lightblue;
      }
    }
  }
`;

const Content = styled.div`
  width: 100%;
`;

function parseExampleImport(group: string, im: any) {
  const component = im.default.title;
  return {
    name: component,
    examples: Object.entries(im)
      .filter(([k]) => k !== "default")
      .map(
        ([name, render]) =>
          ({
            group,
            component,
            name,
            render,
          } as ExampleItem),
      ),
  };
}

const allExamples = Object.entries({ popup, wallet, mui }).map(
  ([title, value]) => ({
    title,
    list: value.default.map((s) => parseExampleImport(title, s)),
  }),
);

interface ExampleItem {
  group: string;
  component: string;
  name: string;
  render: {
    (args: any): VNode;
    args: any;
  };
}

function findByGroupComponentName(
  group: string,
  component: string,
  name: string,
) {
  const gl = allExamples.filter((e) => e.title === group);
  if (gl.length === 0) {
    return undefined;
  }
  const cl = gl[0].list.filter((l) => l.name === component);
  if (cl.length === 0) {
    return undefined;
  }
  const el = cl[0].examples.filter((c) => c.name === name);
  if (el.length === 0) {
    return undefined;
  }
  return el[0];
}

function getContentForExample(item: ExampleItem | undefined): () => VNode {
  if (!item) return () => <div>select example from the list on the left</div>;
  const example = findByGroupComponentName(
    item.group,
    item.component,
    item.name,
  );
  if (!example) return () => <div>example not found</div>;
  return () => example.render(example.render.args);
}

function ExampleList({
  name,
  list,
}: {
  name: string;
  list: {
    name: string;
    examples: ExampleItem[];
  }[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <ol>
      <div onClick={() => setOpen(!open)}>{name}</div>
      {open &&
        list.map((k) => (
          <li>
            <dl>
              <dt>{k.name}</dt>
              {k.examples.map((r) => (
                <dd>
                  <a
                    href={`#${encodeURIComponent(r.group)}-${encodeURIComponent(
                      r.component,
                    )}-${encodeURIComponent(r.name)}`}
                  >
                    {r.name}
                  </a>
                </dd>
              ))}
            </dl>
          </li>
        ))}
    </ol>
  );
}

function getWrapperForGroup(group: string): FunctionComponent {
  switch (group) {
    case "popup":
      return ({ children }: any) => (
        <Fragment>
          <PopupNavBar />
          <PopupBox>{children}</PopupBox>
        </Fragment>
      );
    case "wallet":
      return ({ children }: any) => (
        <Fragment>
          <LogoHeader />
          <WalletNavBar />
          <WalletBox>{children}</WalletBox>
        </Fragment>
      );
    default:
      return Fragment;
  }
}

function ErrorReport({
  children,
  selected,
}: {
  children: ComponentChild;
  selected: ExampleItem | undefined;
}) {
  const [error] = useErrorBoundary();
  if (error) {
    return (
      <div>
        <p>Error was thrown trying to render</p>
        {selected && (
          <ul>
            <li>
              <b>group</b>: {selected.group}
            </li>
            <li>
              <b>component</b>: {selected.component}
            </li>
            <li>
              <b>example</b>: {selected.name}
            </li>
            <li>
              <b>args</b>:{" "}
              <pre>{JSON.stringify(selected.render.args, undefined, 2)}</pre>
            </li>
          </ul>
        )}
        <p>{error.message}</p>
        <pre>{error.stack}</pre>
      </div>
    );
  }
  return <Fragment>{children}</Fragment>;
}

function getSelectionFromLocationHash(): ExampleItem | undefined {
  if (!location.hash) return undefined;
  const parts = location.hash.substring(1).split("-");
  if (parts.length < 3) return undefined;
  return findByGroupComponentName(
    decodeURIComponent(parts[0]),
    decodeURIComponent(parts[1]),
    decodeURIComponent(parts[2]),
  );
}

function Application() {
  const initialSelection = getSelectionFromLocationHash();
  const [selected, updateSelected] = useState<ExampleItem | undefined>(
    initialSelection,
  );

  function updateSelectedFromHashChange({ newURL, oldURL }: any) {
    const selected = getSelectionFromLocationHash();
    updateSelected(selected);
  }
  useEffect(() => {
    window.addEventListener("hashchange", updateSelectedFromHashChange);
    return () => {
      window.removeEventListener("hashchange", updateSelectedFromHashChange);
    };
  }, []);

  const ExampleContent = getContentForExample(selected);

  const GroupWrapper = getWrapperForGroup(selected?.group || "default");

  return (
    <Page>
      <SideBar>
        {allExamples.map((e) => (
          <ExampleList name={e.title} list={e.list} />
        ))}
        <hr />
      </SideBar>
      <Content>
        <ErrorReport selected={selected}>
          <GroupWrapper>
            <ExampleContent />
          </GroupWrapper>
        </ErrorReport>
      </Content>
    </Page>
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
function main(): void {
  try {
    const container = document.getElementById("container");
    if (!container) {
      throw Error("container not found, can't mount page contents");
    }
    render(<Application />, container);
  } catch (e) {
    console.error("got error", e);
    if (e instanceof Error) {
      document.body.innerText = `Fatal error: "${e.message}".  Please report this bug at https://bugs.gnunet.org/.`;
    }
  }
}