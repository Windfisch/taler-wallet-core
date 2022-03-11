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
import { Fragment, h, VNode } from "preact";
import { Avatar } from "../mui/Avatar";
import { Icon } from "./styled";
import { Typography } from "../mui/Typography";

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
function SignalWifiOffIcon({ ...rest }: any): VNode {
  return <Icon {...rest} />;
}

export const BasicExample = () => (
  <Fragment>
    <Wrapper>
      <p>
        Example taken from:
        <a
          target="_blank"
          rel="noreferrer"
          href="https://medium.com/material-ui/introducing-material-ui-design-system-93e921beb8df"
        >
          https://medium.com/material-ui/introducing-material-ui-design-system-93e921beb8df
        </a>
      </p>
      <Banner
        elements={[
          {
            icon: <SignalWifiOffIcon />,
            description: (
              <Typography>
                You have lost connection to the internet. This app is offline.
              </Typography>
            ),
          },
        ]}
        confirm={{
          label: "turn on wifi",
          action: () => {
            return null;
          },
        }}
      />
    </Wrapper>
  </Fragment>
);

export const PendingOperation = () => (
  <Fragment>
    <Wrapper>
      <Banner
        title="PENDING TRANSACTIONS"
        style={{ backgroundColor: "lightcyan", padding: 8 }}
        elements={[
          {
            icon: (
              <Avatar
                style={{
                  border: "solid blue 1px",
                  color: "blue",
                  boxSizing: "border-box",
                }}
              >
                P
              </Avatar>
            ),
            description: (
              <Typography>
                <b>EUR 37.95</b> - 5 feb 2022
              </Typography>
            ),
          },
        ]}
      />
    </Wrapper>
  </Fragment>
);
