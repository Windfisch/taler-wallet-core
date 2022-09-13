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
import { h, Fragment, VNode, JSX } from "preact";
import { Divider } from "../mui/Divider.js";
import { Button } from "../mui/Button.js";
import { Typography } from "../mui/Typography.js";
import { Avatar } from "../mui/Avatar.js";
import { Grid } from "../mui/Grid.js";
import { Paper } from "../mui/Paper.js";

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  titleHead?: VNode;
  elements: {
    icon?: VNode;
    description: VNode;
    action?: () => void;
  }[];
  confirm?: {
    label: string;
    action: () => Promise<void>;
  };
}

export function Banner({
  titleHead,
  elements,
  confirm,
  ...rest
}: Props): VNode {
  return (
    <Fragment>
      <Paper elevation={0} {...rest}>
        {titleHead && (
          <Grid container>
            <Grid item>{titleHead}</Grid>
          </Grid>
        )}
        <Grid container columns={1}>
          {elements.map((e, i) => (
            <Grid
              container
              item
              xs={1}
              key={i}
              wrap="nowrap"
              spacing={1}
              alignItems="center"
              onClick={e.action}
            >
              {e.icon && (
                <Grid item xs={"auto"}>
                  <Avatar>{e.icon}</Avatar>
                </Grid>
              )}
              <Grid item>{e.description}</Grid>
            </Grid>
          ))}
        </Grid>
        {confirm && (
          <Grid container justifyContent="flex-end" spacing={8}>
            <Grid item>
              <Button color="primary" onClick={confirm.action}>
                {confirm.label}
              </Button>
            </Grid>
          </Grid>
        )}
      </Paper>
      <Divider />
    </Fragment>
  );
}

export default Banner;
