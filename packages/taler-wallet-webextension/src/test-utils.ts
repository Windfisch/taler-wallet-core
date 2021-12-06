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

import { ComponentChildren, FunctionalComponent, h as render, VNode } from "preact";

export function createExample<Props>(
  Component: FunctionalComponent<Props>,
  props: Partial<Props>,
): ComponentChildren {
  const Render = (args: any) => render(Component, args);
  Render.args = props;
  return Render;
}

export function createExampleWithCustomContext<Props, ContextProps>(
  Component: FunctionalComponent<Props>,
  props: Partial<Props>,
  ContextProvider: FunctionalComponent<ContextProps>,
  contextProps: Partial<ContextProps>,
): ComponentChildren {
  const Render = (args: any): VNode => render(Component, args);
  const WithContext = (args: any): VNode => render(ContextProvider, { ...contextProps, children: [Render(args)] } as any);
  WithContext.args = props
  return WithContext
}

export function NullLink({ children }: { children?: ComponentChildren }) {
  return render("a", { children, href: "javascript:void(0);" });
}
