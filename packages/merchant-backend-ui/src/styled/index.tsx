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
import { styled } from '@linaria/react'

export const QRPlaceholder = styled.div`
  margin: auto;
  text-align: center;
  width: 340px; 
`

export const FooterBar = styled.footer`
  text-align: center;
  background-color: #033;
  color: white;
  padding: 1em;
  overflow: auto;

  & > p > a:link,
  & > p > a:visited,
  & > p > a:hover,
  & > p > a:active {
    color: white;
  }
`

export const Page = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100vh;
  align-items: center;
  
  a:link,
  a:visited,
  a:hover,
  a:active {
    color: black;
  }
  
  section {
    text-align: center;
    width: 600px;
    /* margin: auto; */
    /* margin-top: 0px; */
    margin-bottom: auto;
    /* overflow: auto; */
  }
  section:not(:first-of-type) {
    margin-top: 2em;
  }
  & > header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    text-align: center;
  }
  & > footer {
    display: flex;    
    flex-direction: row;
    justify-content: space-around;
    width: 100%;
    margin-bottom: 0px;
  }
`
export const Center = styled.div`
  display: flex;
  justify-content: center;
`

export const WalletLink = styled.a<{ upperCased?: boolean }>`
  display: inline-block;
  zoom: 1;
  line-height: normal;
  white-space: nowrap;
  vertical-align: middle;
  text-align: center;
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;
  text-transform: ${({ upperCased }) => upperCased ? 'uppercase' : 'none'};

  font-family: inherit;
  font-size: 100%;
  padding: 0.5em 1em;
  color: #444; /* rgba not supported (IE 8) */
  color: rgba(0, 0, 0, 0.8); /* rgba supported */
  border: 1px solid #999; /*IE 6/7/8*/
  border: none rgba(0, 0, 0, 0); /*IE9 + everything else*/
  background-color: '#e6e6e6';
  text-decoration: none;
  border-radius: 2px;

  :focus {
    outline: 0;
  }

  &:disabled {
    border: none;
    background-image: none;
    /* csslint ignore:start */
    filter: alpha(opacity=40);
    /* csslint ignore:end */
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
    pointer-events: none;
  }

  :hover {
    filter: alpha(opacity=90);
    background-image: linear-gradient(
      transparent,
      rgba(0, 0, 0, 0.05) 40%,
      rgba(0, 0, 0, 0.1)
    );
  }

  background-color: #e6e6e6;
  border-radius: 4px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15) inset,
    0 0 6px rgba(0, 0, 0, 0.2) inset;
  border-color: #000;
`;

export const InfoBox = styled.div`
  border-radius: 0.25em;
  flex-direction: column;
  /* margin: 0.5em; */
  padding: 1em;
  /* width: 100%; */
  border:solid 1px #b8daff;
  background-color:#cce5ff;
  color:#004085;
`

export const TableExpanded = styled.dl`
  text-align: left;
  dt {
    font-weight: bold;
    margin-top: 1em;
  }
  dd {
    margin-inline-start: 0px;
  }
`

export const TableSimple = styled.dl`
  text-align: left;
  dt {
    font-weight: bold;
    display: inline-block;
    width:30%;
  }
  dd {
    margin-inline-start: 0px;
    display: inline-block;
    width:70%;
  }
`