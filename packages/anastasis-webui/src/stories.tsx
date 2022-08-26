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
import { setupI18n } from "@gnu-taler/taler-util";
import { ComponentChild, Fragment, h, render, VNode } from "preact";
import { useEffect, useErrorBoundary, useState } from "preact/hooks";
import { strings } from "./i18n/strings.js";
import * as pages from "./pages/home/index.storiesNo.js";

const url = new URL(window.location.href);
const lang = url.searchParams.get("lang") || "en";

setupI18n(lang, strings);

const Page = ({ children }: any) => <div class="page">{children}</div>;
const SideBar = ({ children }: any) => <div class="sidebar">{children}</div>;
const Content = ({ children }: any) => <div class="content">{children}</div>;

function parseExampleImport(
  group: string,
  im: any,
  name?: string,
): ComponentItem {
  const component = name || im.default.title;
  const order: number = im.default.args?.order || 0;
  return {
    name: component,
    order,
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

function SortStories(a: any, b: any): number {
  return (a?.order ?? 0) - (b?.order ?? 0);
}

const allExamples = Object.entries({ pages }).map(([title, value]) => {
  return {
    title,
    list: Object.entries(value)
      .filter(([name]) => name != "default")
      .map(([name, value]) => parseExampleImport(title, value, name))
      .sort(SortStories),
  };
});

interface ComponentItem {
  name: string;
  order: number;
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
              <dt>{k.name}</dt>
              {k.examples.map((r) => {
                const e = encodeURIComponent;
                const eId = `${e(r.group)}-${e(r.component)}-${e(r.name)}`;
                function doSelection(e: any): void {
                  e.preventDefault();
                  location.hash = `#${eId}`;
                  onSelectStory(r, eId);
                }
                const isSelected =
                  selected &&
                  selected.component === r.component &&
                  selected.group === r.group &&
                  selected.name === r.name;
                return (
                  <dd
                    id={eId}
                    key={r.name}
                    data-selected={isSelected}
                    onClick={doSelection}
                  >
                    <a href={`#${eId}`} onClick={doSelection}>
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

// function getWrapperForGroup(group: string): FunctionComponent {
//   switch (group) {
//     case "popup":
//       return function PopupWrapper({ children }: any) {
//         return (
//           <Fragment>
//             <PopupNavBar />
//             <PopupBox>{children}</PopupBox>
//           </Fragment>
//         );
//       };
//     case "wallet":
//       return function WalletWrapper({ children }: any) {
//         return (
//           <Fragment>
//             <LogoHeader />
//             <WalletNavBar />
//             <WalletBox>{children}</WalletBox>
//           </Fragment>
//         );
//       };
//     case "cta":
//       return function WalletWrapper({ children }: any) {
//         return (
//           <Fragment>
//             <WalletBox>{children}</WalletBox>
//           </Fragment>
//         );
//       };
//     default:
//       return Fragment;
//   }
// }

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
      <div class="error_report">
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

  // const GroupWrapper = getWrapperForGroup(selected?.group || "default");

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
          {/* <GroupWrapper> */}
          <ExampleContent />
          {/* </GroupWrapper> */}
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
  const socketPath = `ws://localhost:8003/socket`;
  // const socketPath = `${protocol}//${host}:${port}/socket`;

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
  ws.onclose = (e) => {
    console.log("disconnected", e);
  };
}
