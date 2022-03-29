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

import { Grid } from "./Grid.js";
import { Fragment, h, VNode } from "preact";

export default {
  title: "mui/grid",
  component: Grid,
};

function Item({ children }: any): VNode {
  return (
    <div
      style={{
        padding: 10,
        backgroundColor: "white",
        textAlign: "center",
        color: "back",
      }}
    >
      {children}
    </div>
  );
}

function Wrapper({ children }: any): VNode {
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

export const BasicExample = (): VNode => (
  <Fragment>
    <Wrapper>
      <Grid container spacing={2}>
        <Grid item xs={8}>
          <Item>xs=8</Item>
        </Grid>
        <Grid item xs={4}>
          <Item>xs=4</Item>
        </Grid>
        <Grid item xs={4}>
          <Item>xs=4</Item>
        </Grid>
        <Grid item xs={8}>
          <Item>xs=8</Item>
        </Grid>
      </Grid>
    </Wrapper>
    <Wrapper>
      <Grid container spacing={2}>
        <Grid item xs={6} md={8}>
          <Item>xs=6 md=8</Item>
        </Grid>
        <Grid item xs={6} md={4}>
          <Item>xs=6 md=4</Item>
        </Grid>
        <Grid item xs={6} md={4}>
          <Item>xs=6 md=4</Item>
        </Grid>
        <Grid item xs={6} md={8}>
          <Item>xs=6 md=8</Item>
        </Grid>
      </Grid>
    </Wrapper>
  </Fragment>
);

export const Responsive12ColumnsSize = (): VNode => (
  <Fragment>
    <Wrapper>
      <p>Item size is responsive: xs=6 sm=4 md=2</p>
      <Grid container spacing={1} columns={12}>
        {Array.from(Array(6)).map((_, index) => (
          <Grid item xs={6} sm={4} md={2} key={index}>
            <Item>item {index}</Item>
          </Grid>
        ))}
      </Grid>
    </Wrapper>
    <Wrapper>
      <p>Item size is fixed</p>
      <Grid container spacing={1} columns={12}>
        {Array.from(Array(6)).map((_, index) => (
          <Grid item xs={6} key={index}>
            <Item>item {index}</Item>
          </Grid>
        ))}
      </Grid>
    </Wrapper>
  </Fragment>
);

export const Responsive12Spacing = (): VNode => (
  <Fragment>
    <Wrapper>
      <p>Item space is responsive: xs=1 sm=2 md=3</p>
      <Grid container spacing={{ xs: 2, sm: 4, md: 6 }} columns={12}>
        {Array.from(Array(6)).map((_, index) => (
          <Grid item xs={6} key={index}>
            <Item>item {index}</Item>
          </Grid>
        ))}
      </Grid>
    </Wrapper>
    <Wrapper>
      <p>Item space is fixed</p>
      <Grid container spacing={1} columns={12}>
        {Array.from(Array(6)).map((_, index) => (
          <Grid item xs={6} key={index}>
            <Item>item {index}</Item>
          </Grid>
        ))}
      </Grid>
    </Wrapper>

    <Wrapper>
      <p>Item row space is responsive: xs=6 sm=4 md=1</p>
      <Grid
        container
        rowSpacing={{ xs: 6, sm: 3, md: 1 }}
        columnSpacing={1}
        columns={12}
      >
        {Array.from(Array(6)).map((_, index) => (
          <Grid item xs={6} key={index}>
            <Item>item {index}</Item>
          </Grid>
        ))}
      </Grid>
    </Wrapper>
    <Wrapper>
      <p>Item col space is responsive: xs=6 sm=3 md=1</p>
      <Grid
        container
        columnSpacing={{ xs: 6, sm: 3, md: 1 }}
        rowSpacing={1}
        columns={12}
      >
        {Array.from(Array(6)).map((_, index) => (
          <Grid item xs={6} key={index}>
            <Item>item {index}</Item>
          </Grid>
        ))}
      </Grid>
    </Wrapper>
  </Fragment>
);

export const ResponsiveAuthWidth = (): VNode => (
  <Fragment>
    <Wrapper>
      <Grid container columns={12}>
        <Grid item>
          <Item>item 1</Item>
        </Grid>
        <Grid item xs={1}>
          <Item>item 2 short</Item>
        </Grid>
        <Grid item>
          <Item>item 3 with long text </Item>
        </Grid>
        <Grid item xs={"true"}>
          <Item>item 4</Item>
        </Grid>
      </Grid>
    </Wrapper>
  </Fragment>
);
export const Example = (): VNode => (
  <Wrapper>
    <p>Item row space is responsive: xs=6 sm=4 md=1</p>
    <Grid container rowSpacing={3} columnSpacing={1} columns={12}>
      {Array.from(Array(6)).map((_, index) => (
        <Grid item xs={6} key={index}>
          <Item>item {index}</Item>
        </Grid>
      ))}
    </Grid>
  </Wrapper>
);
