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

import { h, VNode } from "preact";
import { Paper } from "./Paper.js";

export default {
  title: "mui/paper",
  component: Paper,
};

export const BasicExample = (): VNode => (
  <div
    style={{
      display: "flex",
      wrap: "nowrap",
      backgroundColor: "lightgray",
      width: "100%",
      padding: 10,
      justifyContent: "space-between",
    }}
  >
    <Paper elevation={0}>
      <div style={{ height: 128, width: 128 }} />
    </Paper>
    <Paper>
      <div style={{ height: 128, width: 128 }} />
    </Paper>
    <Paper elevation={3}>
      <div style={{ height: 128, width: 128 }} />
    </Paper>
    <Paper elevation={8}>
      <div style={{ height: 128, width: 128 }} />
    </Paper>
  </div>
);

export const Outlined = (): VNode => (
  <div
    style={{
      display: "flex",
      wrap: "nowrap",
      backgroundColor: "lightgray",
      width: "100%",
      padding: 10,
      justifyContent: "space-around",
    }}
  >
    <Paper variant="outlined">
      <div
        style={{
          textAlign: "center",
          height: 128,
          width: 128,
          lineHeight: "128px",
        }}
      >
        round
      </div>
    </Paper>
    <Paper variant="outlined" square>
      <div
        style={{
          textAlign: "center",
          height: 128,
          width: 128,
          lineHeight: "128px",
        }}
      >
        square
      </div>
    </Paper>
  </div>
);

export const Elevation = (): VNode => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      backgroundColor: "lightgray",
      width: "100%",
      padding: 50,
      justifyContent: "space-around",
    }}
  >
    {[0, 1, 2, 3, 4, 6, 8, 12, 16, 24].map((elevation) => (
      <div style={{ marginTop: 50 }} key={elevation}>
        <Paper elevation={elevation}>
          <div
            style={{
              textAlign: "center",
              height: 60,
              lineHeight: "60px",
            }}
          >{`elevation=${elevation}`}</div>
        </Paper>
      </div>
    ))}
  </div>
);

export const ElevationDark = (): VNode => (
  <div
    class="theme-dark"
    style={{
      display: "flex",
      flexDirection: "column",
      backgroundColor: "lightgray",
      width: "100%",
      padding: 50,
      justifyContent: "space-around",
    }}
  >
    to be implemented
    {/* {[0, 1, 2, 3, 4, 6, 8, 12, 16, 24].map((elevation) => (
      <div style={{ marginTop: 50 }} key={elevation}>
        <Paper elevation={elevation}>
          <div
            style={{
              textAlign: "center",
              height: 60,
              lineHeight: "60px",
            }}
          >{`elevation=${elevation}`}</div>
        </Paper>
      </div>
    ))} */}
  </div>
);
