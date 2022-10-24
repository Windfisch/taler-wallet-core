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
import { Fragment, h, render, VNode } from 'preact';
import { render as renderToString } from 'preact-render-to-string';
import { Footer } from '../components/Footer';
import "../css/pure-min.css";
import "../css/style.css";
import { Page } from '../styled';

function Head(): VNode {
  return <title>Status of your tip</title>
}

export function DepletedTip(): VNode {
  return <Page>
    <section>
      <h1>Tip already collected</h1>
      <div>
        You have already collected this tip.
      </div>
    </section>
    <Footer />
  </Page>
}

export function mount(): void {
  try {
    render(<DepletedTip />, document.body);
  } catch (e) {
    console.error("got error", e);
    if (e instanceof Error) {
      document.body.innerText = `Fatal error: "${e.message}".  Please report this bug at https://bugs.gnunet.org/.`;
    }
  }
}

export function buildTimeRendering(): { head: string, body: string } {
  return {
    head: renderToString(<Head />),
    body: renderToString(<DepletedTip />)
  }
}
