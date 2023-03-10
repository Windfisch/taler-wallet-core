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
import { h, VNode } from 'preact';
import { FooterBar } from '../styled';

export function Footer(): VNode {
  return <FooterBar>
    <p>
      <a href="https://taler.net/">Learn more about GNU Taler on our website.</a>
      <p>Copyright &copy; 2014&mdash;2021 Taler Systems SA</p>
    </p>
  </FooterBar>
}

