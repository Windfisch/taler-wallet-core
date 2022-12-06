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
import e from "express";
import {
  ComponentChild,
  ComponentChildren,
  Fragment,
  FunctionalComponent,
  FunctionComponent,
  h,
  JSX,
  render,
  VNode,
} from "preact";
import { useEffect, useErrorBoundary, useState } from "preact/hooks";

const Page: FunctionalComponent = ({ children }): VNode => {
  return (
    <div
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        width: "100%",
        display: "flex",
        flexDirection: "row",
      }}
    >
      {children}
    </div>
  );
};

const SideBar: FunctionalComponent<{ width: number }> = ({
  width,
  children,
}): VNode => {
  return (
    <div
      style={{
        minWidth: width,
        height: "calc(100vh - 20px)",
        overflowX: "hidden",
        overflowY: "visible",
        scrollBehavior: "smooth",
      }}
    >
      {children}
    </div>
  );
};

const ResizeHandleDiv: FunctionalComponent<
  JSX.HTMLAttributes<HTMLDivElement>
> = ({ children, ...props }): VNode => {
  return (
    <div
      {...props}
      style={{
        width: 10,
        backgroundColor: "#ddd",
        cursor: "ew-resize",
      }}
    >
      {children}
    </div>
  );
};

const Content: FunctionalComponent = ({ children }): VNode => {
  return (
    <div
      style={{
        width: "100%",
        padding: 20,
      }}
    >
      {children}
    </div>
  );
};

function findByGroupComponentName(
  allExamples: Group[],
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

function getContentForExample(
  item: ExampleItem | undefined,
  allExamples: Group[],
): FunctionalComponent {
  if (!item)
    return function SelectExampleMessage() {
      return <div>select example from the list on the left</div>;
    };
  const example = findByGroupComponentName(
    allExamples,
    item.group,
    item.component,
    item.name,
  );
  if (!example) {
    return function ExampleNotFoundMessage() {
      return <div>example not found</div>;
    };
  }
  return () => example.render.component(example.render.props);
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
    <ol style={{ padding: 4, margin: 0 }}>
      <div
        style={{ backgroundColor: "lightcoral", cursor: "pointer" }}
        onClick={() => setOpen(!isOpen)}
      >
        {name}
      </div>
      <div style={{ display: isOpen ? undefined : "none" }}>
        {list.map((k) => (
          <li key={k.name}>
            <dl style={{ margin: 0 }}>
              <dt>{k.name}</dt>
              {k.examples.map((r, i) => {
                const e = encodeURIComponent;
                const eId = `${e(r.group)}-${e(r.component)}-${e(r.name)}`;
                const isSelected =
                  selected &&
                  selected.component === r.component &&
                  selected.group === r.group &&
                  selected.name === r.name;
                return (
                  <dd
                    id={eId}
                    key={r.name}
                    style={{
                      backgroundColor: isSelected
                        ? "green"
                        : i % 2
                        ? "lightgray"
                        : "lightblue",
                      marginLeft: "1em",
                      padding: 4,
                      cursor: "pointer",
                      borderRadius: 4,
                      marginBottom: 4,
                    }}
                  >
                    <a
                      href={`#${eId}`}
                      style={{ color: "black" }}
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
        return true;
      }}
    >
      {children}
    </div>
  );
}

function ErrorReport({
  children,
  selected,
}: {
  children: ComponentChild;
  selected: ExampleItem | undefined;
}): VNode {
  const [error, resetError] = useErrorBoundary();
  //if there is an error, reset when unloading this component
  useEffect(() => (error ? resetError : undefined));
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
              <pre>{JSON.stringify(selected.render.props, undefined, 2)}</pre>
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

function getSelectionFromLocationHash(
  hash: string,
  allExamples: Group[],
): ExampleItem | undefined {
  if (!hash) return undefined;
  const parts = hash.substring(1).split("-");
  if (parts.length < 3) return undefined;
  return findByGroupComponentName(
    allExamples,
    decodeURIComponent(parts[0]),
    decodeURIComponent(parts[1]),
    decodeURIComponent(parts[2]),
  );
}

function parseExampleImport(
  group: string,
  componentName: string,
  im: MaybeComponent,
): ComponentItem {
  const examples: ExampleItem[] = Object.entries(im)
    .filter(([k]) => k !== "default")
    .map(([exampleName, exampleValue]): ExampleItem => {
      if (!exampleValue) {
        throw Error(
          `example "${exampleName}" from component "${componentName}" in group "${group}" is undefined`,
        );
      }

      if (typeof exampleValue === "function") {
        return {
          group,
          component: componentName,
          name: exampleName,
          render: {
            component: exampleValue as FunctionComponent,
            props: {},
          },
        };
      }
      const v: any = exampleValue;
      if (
        "component" in v &&
        typeof v.component === "function" &&
        "props" in v
      ) {
        return {
          group,
          component: componentName,
          name: exampleName,
          render: v,
        };
      }
      throw Error(
        `example "${exampleName}" from component "${componentName}" in group "${group}" doesn't follow one of the two ways of example`,
      );
    });
  return {
    name: componentName,
    examples,
  };
}

export function parseGroupImport(
  groups: Record<string, ComponentOrFolder>,
): Group[] {
  return Object.entries(groups).map(([groupName, value]) => {
    return {
      title: groupName,
      list: Object.entries(value).flatMap(([key, value]) =>
        folder(groupName, value),
      ),
    };
  });
}

export interface Group {
  title: string;
  list: ComponentItem[];
}

export interface ComponentItem {
  name: string;
  examples: ExampleItem[];
}

export interface ExampleItem {
  group: string;
  component: string;
  name: string;
  render: {
    component: FunctionalComponent;
    props: object;
  };
}

type ComponentOrFolder = MaybeComponent | MaybeFolder;
interface MaybeFolder {
  default?: { title: string };
  // [exampleName: string]: FunctionalComponent;
}
interface MaybeComponent {
  // default?: undefined;
  [exampleName: string]: undefined | object;
}

function folder(groupName: string, value: ComponentOrFolder): ComponentItem[] {
  let title: string | undefined = undefined;
  try {
    title =
      typeof value === "object" &&
      typeof value.default === "object" &&
      value.default !== undefined &&
      "title" in value.default &&
      typeof value.default.title === "string"
        ? value.default.title
        : undefined;
  } catch (e) {
    throw Error(
      `Could not defined if it is component or folder ${groupName}: ${JSON.stringify(
        value,
        undefined,
        2,
      )}`,
    );
  }
  if (title) {
    const c = parseExampleImport(groupName, title, value as MaybeComponent);
    return [c];
  }
  return Object.entries(value).flatMap(([subkey, value]) =>
    folder(groupName, value),
  );
}

interface Props {
  getWrapperForGroup: (name: string) => FunctionComponent;
  examplesInGroups: Group[];
  langs: Record<string, object>;
}

function Application({
  langs,
  examplesInGroups,
  getWrapperForGroup,
}: Props): VNode {
  const initialSelection = getSelectionFromLocationHash(
    location.hash,
    examplesInGroups,
  );

  const url = new URL(window.location.href);
  const currentLang = url.searchParams.get("lang") || "en";

  if (!langs["en"]) {
    langs["en"] = {};
  }
  setupI18n(currentLang, langs);

  const [selected, updateSelected] = useState<ExampleItem | undefined>(
    initialSelection,
  );
  const [sidebarWidth, setSidebarWidth] = useState(200);
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

  const GroupWrapper = getWrapperForGroup(selected?.group || "default");
  const ExampleContent = getContentForExample(selected, examplesInGroups);

  //style={{ "--with-size": `${sidebarWidth}px` }}
  return (
    <Page>
      {/* <LiveReload /> */}
      <SideBar width={sidebarWidth}>
        <div>
          Language:
          <select
            value={currentLang}
            onChange={(e) => {
              const url = new URL(window.location.href);
              url.searchParams.set("lang", e.currentTarget.value);
              window.location.href = url.href;
            }}
          >
            {Object.keys(langs).map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        {examplesInGroups.map((group) => (
          <ExampleList
            key={group.title}
            name={group.title}
            list={group.list}
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
      <ResizeHandle
        onUpdate={(x) => {
          setSidebarWidth((s) => s + x);
        }}
      />
      <Content>
        <ErrorReport selected={selected}>
          <PreventLinkNavigation>
            <GroupWrapper>
              <ExampleContent />
            </GroupWrapper>
          </PreventLinkNavigation>
        </ErrorReport>
      </Content>
    </Page>
  );
}

export interface Options {
  id?: string;
  strings?: any;
  getWrapperForGroup?: (name: string) => FunctionComponent;
}

export function renderStories(
  groups: Record<string, ComponentOrFolder>,
  options: Options = {},
): void {
  const examples = parseGroupImport(groups);

  try {
    const cid = options.id ?? "container";
    const container = document.getElementById(cid);
    if (!container) {
      throw Error(
        `container with id ${cid} not found, can't mount page contents`,
      );
    }
    render(
      <Application
        examplesInGroups={examples}
        getWrapperForGroup={options.getWrapperForGroup ?? (() => Fragment)}
        langs={options.strings ?? { en: {} }}
      />,
      container,
    );
  } catch (e) {
    console.error("got error", e);
    if (e instanceof Error) {
      document.body.innerText = `Fatal error: "${e.message}".  Please report this bug at https://bugs.gnunet.org/.`;
    }
  }
}

function ResizeHandle({ onUpdate }: { onUpdate: (x: number) => void }): VNode {
  const [start, setStart] = useState<number | undefined>(undefined);
  return (
    <ResizeHandleDiv
      onMouseDown={(e: any) => {
        setStart(e.pageX);
        console.log("active", e.pageX);
        return false;
      }}
      onMouseMove={(e: any) => {
        if (start !== undefined) {
          onUpdate(e.pageX - start);
        }
        return false;
      }}
      onMouseUp={() => {
        setStart(undefined);
        return false;
      }}
    />
  );
}
