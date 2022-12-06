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

import { css } from "@linaria/core";
import { ComponentChildren, Fragment, h, VNode } from "preact";
import { Alert } from "./Alert.jsx";

export default {
  title: "alert",
  component: Alert,
};

function Wrapper({ children }: { children: ComponentChildren }): VNode {
  return (
    <div
      class={css`
        & > * {
          margin: 2em;
        }
      `}
    >
      {children}
    </div>
  );
}

export const BasicExample = (): VNode => (
  <Wrapper>
    <Alert severity="warning">this is an warning</Alert>
    <Alert severity="error">this is an error</Alert>
    <Alert severity="success">this is an success</Alert>
    <Alert severity="info">this is an info</Alert>
  </Wrapper>
);

export const WithTitle = (): VNode => (
  <Wrapper>
    <Alert title="Warning" severity="warning">
      this is an warning
    </Alert>
    <Alert title="Error" severity="error">
      this is an error
    </Alert>
    <Alert title="Success" severity="success">
      this is an success
    </Alert>
    <Alert title="Info" severity="info">
      this is an info
    </Alert>
  </Wrapper>
);

const showSomething = async function (): Promise<void> {
  alert("closed");
};

export const WithAction = (): VNode => (
  <Wrapper>
    <Alert title="Warning" severity="warning" onClose={showSomething}>
      this is an warning
    </Alert>
    <Alert title="Error" severity="error" onClose={showSomething}>
      this is an error
    </Alert>
    <Alert title="Success" severity="success" onClose={showSomething}>
      this is an success
    </Alert>
    <Alert title="Info" severity="info" onClose={showSomething}>
      this is an info
    </Alert>
  </Wrapper>
);
