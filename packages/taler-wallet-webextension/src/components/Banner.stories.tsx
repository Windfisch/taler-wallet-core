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

import { Banner } from "./Banner";
import { Fragment, h } from "preact";

export default {
  title: "mui/banner",
  component: Banner,
};

function Wrapper({ children }: any) {
  return (
    <div
      style={{
        display: "flex",
        backgroundColor: "lightgray",
        padding: 10,
        width: "100%",
        // width: 400,
        // height: 400,
        justifyContent: "center",
      }}
    >
      <div style={{ flexGrow: 1 }}>{children}</div>
    </div>
  );
}

export const BasicExample = () => (
  <Fragment>
    <Wrapper>
      <Banner />
    </Wrapper>
  </Fragment>
);
