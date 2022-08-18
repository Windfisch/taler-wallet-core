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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */
import { setupI18n } from "@gnu-taler/taler-util";
import { styled } from "@linaria/react";
import {
  ComponentChild,
  ComponentChildren,
  Fragment,
  FunctionComponent,
  h,
  render,
  VNode,
} from "preact";
import { useEffect, useErrorBoundary, useState } from "preact/hooks";
import { LogoHeader } from "./components/LogoHeader.js";
import { PopupBox, WalletBox } from "./components/styled/index.js";
import * as mui from "./mui/index.stories.js";
import { PopupNavBar, WalletNavBar } from "./NavigationBar.js";
import * as popup from "./popup/index.stories.js";
import * as wallet from "./wallet/index.stories.js";
import * as cta from "./cta/index.stories.js";
import * as components from "./components/index.stories.js";
import { strings } from "./i18n/strings.js";
import { setupPlatform } from "./platform/api.js";
import chromeAPI from "./platform/chrome.js";
import firefoxAPI from "./platform/firefox.js";

const url = new URL(window.location.href);
const lang = url.searchParams.get("lang") || "en";

setupI18n(lang, strings);

const Page = styled.div`
  * {
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
  scroll-behavior: smooth;

  * {
    margin: 0px;
    padding: 0px;
  }

  & > {
    ol {
      padding: 4px;
      div:first-child {
        background-color: lightcoral;
        cursor: pointer;
      }
      div[data-hide="true"] {
        display: none;
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
      a {
        color: black;
      }
      dd[data-selected] {
        background-color: green;
      }
    }
  }
`;

const Content = styled.div`
  width: 100%;
  padding: 20px;
`;

function parseExampleImport(group: string, im: any): ComponentItem {
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

const allExamples = Object.entries({ popup, wallet, cta, mui, components }).map(
  ([title, value]) => ({
    title,
    list: value.default.map((s) => parseExampleImport(title, s)),
  }),
);

interface ComponentItem {
  name: string;
  examples: ExampleItem[];
}

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
): ExampleItem | undefined {
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
  if (!item)
    return function SelectExampleMessage() {
      return <div>select example from the list on the left</div>;
    };
  const example = findByGroupComponentName(
    item.group,
    item.component,
    item.name,
  );
  if (!example)
    return function ExampleNotFoundMessage() {
      return <div>example not found</div>;
    };
  return () => example.render(example.render.args);
}

function ExampleList({
  name,
  list,
  selected,
  onSelectStory,
}: {
  name: string;
  list: {
    name: string;
    examples: ExampleItem[];
  }[];
  selected: ExampleItem | undefined;
  onSelectStory: (i: ExampleItem, id: string) => void;
}): VNode {
  const [isOpen, setOpen] = useState(selected && selected.group === name);
  return (
    <ol>
      <div onClick={() => setOpen(!isOpen)}>{name}</div>
      <div data-hide={!isOpen}>
        {list.map((k) => (
          <li key={k.name}>
            <dl>
              <dt>{k.name.substring(k.name.indexOf("/") + 1)}</dt>
              {k.examples.map((r) => {
                const e = encodeURIComponent;
                const eId = `${e(r.group)}-${e(r.component)}-${e(r.name)}`;
                const isSelected =
                  selected &&
                  selected.component === r.component &&
                  selected.group === r.group &&
                  selected.name === r.name;
                return (
                  <dd id={eId} key={r.name} data-selected={isSelected}>
                    <a
                      href={`#${eId}`}
                      onClick={(e) => {
                        e.preventDefault();
                        location.hash = `#${eId}`;
                        onSelectStory(r, eId);
                        history.pushState({}, "", `#${eId}`);
                      }}
                    >
                      {r.name}
                    </a>
                  </dd>
                );
              })}
            </dl>
          </li>
        ))}
      </div>
    </ol>
  );
}

/**
 * Prevents the UI from redirecting and inform the dev
 * where the <a /> should have redirected
 * @returns
 */
function PreventLinkNavigation({
  children,
}: {
  children: ComponentChildren;
}): VNode {
  return (
    <div
      onClick={(e) => {
        let t: any = e.target;
        do {
          if (t.localName === "a" && t.getAttribute("href")) {
            alert(`should navigate to: ${t.attributes.href.value}`);
            e.stopImmediatePropagation();
            e.stopPropagation();
            e.preventDefault();
            return false;
          }
        } while ((t = t.parentNode));
      }}
    >
      {children}
    </div>
  );
}

function getWrapperForGroup(group: string): FunctionComponent {
  switch (group) {
    case "popup":
      return function PopupWrapper({ children }: any) {
        return (
          <PreventLinkNavigation>
            <PopupNavBar />
            <PopupBox>{children}</PopupBox>
          </PreventLinkNavigation>
        );
      };
    case "wallet":
      return function WalletWrapper({ children }: any) {
        return (
          <PreventLinkNavigation>
            <LogoHeader />
            <WalletNavBar />
            <WalletBox>{children}</WalletBox>
          </PreventLinkNavigation>
        );
      };
    case "cta":
      return function WalletWrapper({ children }: any) {
        return (
          <PreventLinkNavigation>
            <WalletBox>{children}</WalletBox>
          </PreventLinkNavigation>
        );
      };
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
}): VNode {
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

function getSelectionFromLocationHash(hash: string): ExampleItem | undefined {
  if (!hash) return undefined;
  const parts = hash.substring(1).split("-");
  if (parts.length < 3) return undefined;
  return findByGroupComponentName(
    decodeURIComponent(parts[0]),
    decodeURIComponent(parts[1]),
    decodeURIComponent(parts[2]),
  );
}

function Application(): VNode {
  const initialSelection = getSelectionFromLocationHash(location.hash);
  const [selected, updateSelected] = useState<ExampleItem | undefined>(
    initialSelection,
  );
  useEffect(() => {
    if (location.hash) {
      const hash = location.hash.substring(1);
      const found = document.getElementById(hash);
      if (found) {
        setTimeout(() => {
          found.scrollIntoView({
            block: "center",
          });
        }, 10);
      }
    }
  }, []);

  const ExampleContent = getContentForExample(selected);

  const GroupWrapper = getWrapperForGroup(selected?.group || "default");

  return (
    <Page>
      <LiveReload />
      <SideBar>
        {allExamples.map((e) => (
          <ExampleList
            key={e.title}
            name={e.title}
            list={e.list}
            selected={selected}
            onSelectStory={(item, htmlId) => {
              document.getElementById(htmlId)?.scrollIntoView({
                block: "center",
              });
              updateSelected(item);
            }}
          />
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

let liveReloadMounted = false;
function LiveReload({ port = 8002 }: { port?: number }): VNode {
  const [isReloading, setIsReloading] = useState(false);
  useEffect(() => {
    if (!liveReloadMounted) {
      setupLiveReload(port, () => {
        setIsReloading(true);
        window.location.reload();
      });
      liveReloadMounted = true;
    }
  });

  if (isReloading) {
    return (
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0,0.5)",
          color: "white",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <h1 style={{ margin: "auto" }}>reloading...</h1>
      </div>
    );
  }
  return <Fragment />;
}

function setupLiveReload(port: number, onReload: () => void): void {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const host = location.hostname;
  const socketPath = `${protocol}//${host}:${port}/socket`;

  const ws = new WebSocket(socketPath);
  ws.onmessage = (message) => {
    const event = JSON.parse(message.data);
    if (event.type === "LOG") {
      console.log(event.message);
    }
    if (event.type === "RELOAD") {
      onReload();
    }
  };
  ws.onerror = (error) => {
    console.error(error);
  };
}

const isFirefox = typeof (window as any)["InstallTrigger"] !== "undefined";

//FIXME: create different entry point for any platform instead of
//switching in runtime
if (isFirefox) {
  console.log("Wallet setup for Firefox API");
  setupPlatform(firefoxAPI);
} else {
  console.log("Wallet setup for Chrome API");
  setupPlatform(chromeAPI);
}
