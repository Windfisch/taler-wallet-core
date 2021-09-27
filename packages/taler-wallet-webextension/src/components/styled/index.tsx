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


// need to import linaria types, otherwise compiler will complain
import type * as Linaria from '@linaria/core';

import { styled } from '@linaria/react';

export const PaymentStatus = styled.div<{ color: string }>`
  padding: 5px;
  border-radius: 5px;
  color: white;
  background-color: ${p => p.color};
`

export const WalletAction = styled.section`
  display: flex;
  text-align: center;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  /* max-width: 50%; */

  margin: auto;
  height: 100%;
  
  & h1:first-child {
    margin-top: 0; 
  }
  section {
    margin-bottom: 2em;
    & button {
      margin-right: 8px;
      margin-left: 8px;
    }
  }
`
export const WalletActionOld = styled.section`
  border: solid 5px black;
  border-radius: 10px;
  margin-left: auto;
  margin-right: auto;
  padding-top: 2em;
  max-width: 50%;
  padding: 2em;

  margin: auto;
  height: 100%;
  
  & h1:first-child {
    margin-top: 0; 
  }
`

export const DateSeparator = styled.div`
  color: gray;
  margin: .2em;
  margin-top: 1em;
`
export const WalletBox = styled.div<{ noPadding?: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  & > * {
    width: 400px;
  }
  & > section {
    padding-left: ${({ noPadding }) => noPadding ? '0px' : '8px'};
    padding-right: ${({ noPadding }) => noPadding ? '0px' : '8px'};
    // this margin will send the section up when used with a header
    margin-bottom: auto; 
    overflow: auto;

    table td {
      padding: 5px 10px;
    }
    table tr {
      border-bottom: 1px solid black;
      border-top: 1px solid black;
    }
  }

  & > header {
    flex-direction: row;
    justify-content: space-between;
    display: flex;
    padding: 8px;
    margin-bottom: 5px;

    & > div {
      align-self: center;
    }

    & > h3 {
      margin: 0px;
    }

    & > .title {
      /* margin: 1em; */
      font-size: large;
      color: #3c4e92;
    }
  }

  & > footer {
    padding-top: 8px;
    padding-bottom: 8px;
    flex-direction: row;
    justify-content: space-between;
    display: flex;
    background-color: #f7f7f7;
    & button {
      margin-right: 8px;
      margin-left: 8px;
    }
  }
`

export const PopupBox = styled.div<{ noPadding?: boolean }>`
  height: 290px;
  width: 400px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  & > section {
    padding-left: ${({ noPadding }) => noPadding ? '0px' : '8px'};
    padding-right: ${({ noPadding }) => noPadding ? '0px' : '8px'};
    // this margin will send the section up when used with a header
    margin-bottom: auto; 
    overflow: auto;

    table td {
      padding: 5px 10px;
    }
    table tr {
      border-bottom: 1px solid black;
      border-top: 1px solid black;
    }
  }

  & > header {
    flex-direction: row;
    justify-content: space-between;
    display: flex;
    padding: 8px;
    margin-bottom: 5px;

    & > div {
      align-self: center;
    }

    & > h3 {
      margin: 0px;
    }

    & > .title {
      /* margin: 1em; */
      font-size: large;
      color: #3c4e92;
    }
  }

  & > footer {
    padding-top: 8px;
    padding-bottom: 8px;
    flex-direction: row;
    justify-content: space-between;
    display: flex;
    & button {
      margin-right: 8px;
      margin-left: 8px;
    }
  }

`

export const Button = styled.button<{ upperCased?: boolean }>`
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
`;

export const Link = styled.a<{ upperCased?: boolean }>`
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
  background-color: transparent;
  text-decoration: none;

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
    text-decoration: underline;
    /* filter: alpha(opacity=90);
    background-image: linear-gradient(
      transparent,
      rgba(0, 0, 0, 0.05) 40%,
      rgba(0, 0, 0, 0.1)
    ); */
  }
`;

export const FontIcon = styled.div`
  font-family: monospace;
  font-size: x-large;
  text-align: center;
  font-weight: bold;
  /* vertical-align: text-top; */
`
export const ButtonBox = styled(Button)`
  padding: .5em;
  width: fit-content;
  height: 2em;

  & > ${FontIcon} {
    width: 1em;
    height: 1em;
    display: inline;
    line-height: 0px;
  }
  background-color: transparent;

  border: 1px solid;
  border-radius: 4px;
  border-color: black;
  color: black;
`


const ButtonVariant = styled(Button)`
  color: white;
  border-radius: 4px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
`

export const ButtonPrimary = styled(ButtonVariant)`
  background-color: rgb(66, 184, 221);
`
export const ButtonBoxPrimary = styled(ButtonBox)`
  color: rgb(66, 184, 221);
  border-color: rgb(66, 184, 221);
`

export const ButtonSuccess = styled(ButtonVariant)`
  background-color: #388e3c;
`
export const LinkSuccess = styled(Link)`
  color: #388e3c;
`
export const ButtonBoxSuccess = styled(ButtonBox)`
  color: #388e3c;
  border-color: #388e3c;
`

export const ButtonWarning = styled(ButtonVariant)`
  background-color: rgb(223, 117, 20);
`
export const LinkWarning = styled(Link)`
  color: rgb(223, 117, 20);
`
export const ButtonBoxWarning = styled(ButtonBox)`
  color: rgb(223, 117, 20);
  border-color: rgb(223, 117, 20);
`

export const ButtonDestructive = styled(ButtonVariant)`
  background-color: rgb(202, 60, 60);
`
export const ButtonBoxDestructive = styled(ButtonBox)`
  color: rgb(202, 60, 60);
  border-color: rgb(202, 60, 60);
`


export const BoldLight = styled.div`
color: gray;
font-weight: bold;
`
export const Centered = styled.div`
  text-align: center;
  & > :not(:first-child) {
    margin-top: 15px;
  }
`
export const Row = styled.div`
  display: flex;
  margin: 0.5em 0;
  justify-content: space-between;
  padding: 0.5em;
`

export const Row2 = styled.div`
  display: flex;
  /* margin: 0.5em 0; */
  justify-content: space-between;
  padding: 0.5em;
`

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0em 1em;
  justify-content: space-between;
`

export const RowBorderGray = styled(Row)`
  border: 1px solid gray;
  /* border-radius: 0.5em; */
`

export const RowLightBorderGray = styled(Row2)`
  border: 1px solid lightgray;
  border-top: 0px;

  ${DateSeparator} + & {
    border: 1px solid lightgray;
    background-color: red;
  }
`

export const HistoryRow = styled.a`
  text-decoration: none;
  color: #212121;

  display: flex;
  justify-content: space-between;
  padding: 0.5em;
  
  border: 1px solid lightgray;
  border-top: 0px;

  ${DateSeparator} + & {
    border: 1px solid lightgray;
  }

  :hover {
    background-color: lightgray;
  }

  & > ${Column}:last-of-type {
    margin-left: auto;
    align-self: center;
  }
`

export const ListOfProducts = styled.div`
  & > div > a > img {
    max-width: 100%;
    display: inline-block;

    width: 32px;
    height: 32px;
  }
  & > div > div {
    margin-right: auto;
    margin-left: 1em;
  }
`

export const LightText = styled.div`
  color: gray;
`

export const SmallText = styled.div`
  font-size: small; 
`
export const LargeText = styled.div`
  font-size: large; 
`

export const ExtraLargeText = styled.div`
  font-size: x-large; 
`

export const SmallLightText = styled(SmallText)`
  color: gray;
`

export const CenteredText = styled.div`
  white-space: nowrap;
  text-align: center;
`

export const CenteredBoldText = styled(CenteredText)`
  white-space: nowrap;
  text-align: center;
  font-weight: bold;
  color: ${((props: any): any => String(props.color) as any) as any};
`

export const Input = styled.div<{ invalid?: boolean }>`
  & label {
    display: block;
    padding: 5px;
    color: ${({ invalid }) => !invalid ? 'inherit' : 'red'}
  }
  & input {
    display: block;
    padding: 5px;
    width: calc(100% - 4px - 10px);
    border-color: ${({ invalid }) => !invalid ? 'inherit' : 'red'}
  }
`

export const InputWithLabel = styled.div<{ invalid?: boolean }>`
  & label {
    display: block;
    padding: 5px;
    color: ${({ invalid }) => !invalid ? 'inherit' : 'red'}
  }
  & > div {
    position: relative;
    display: flex;
    top: 0px;
    bottom: 0px;

    &  > div {
      position: absolute;
      background-color: lightgray;
      padding: 5px;
      margin: 2px;
    }

    &  > input {
      flex: 1;
      padding: 5px; 
      border-color: ${({ invalid }) => !invalid ? 'inherit' : 'red'}
    }
  }
`

export const ErrorBox = styled.div`
  border: 2px solid #f5c6cb;
  border-radius: 0.25em;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  /* margin: 0.5em; */
  padding: 1em;
  /* width: 100%; */
  color: #721c24;
  background: #f8d7da;

  & > div {
    display: flex;
    justify-content: space-between;

    & > button {
      align-self: center;
      font-size: 100%;
      padding: 0;
      height: 28px;
      width: 28px;
    }
  }
`

export const SuccessBox = styled(ErrorBox)`
  color: #0f5132;
  background-color: #d1e7dd;
  border-color: #badbcc;
`

export const WarningBox = styled(ErrorBox)`
  color: #664d03;
  background-color: #fff3cd;
  border-color: #ffecb5;
`

export const PopupNavigation = styled.div<{ devMode?: boolean }>`
  background-color:#0042b2;
  height: 35px;
  justify-content: space-around;
  display: flex;

  & > div {
    width: 400px;
  }

  & > div > a {
    color: #f8faf7;
    display: inline-block;
    width: calc(400px / ${({ devMode }) => !devMode ? 4 : 5});
    text-align: center;
    text-decoration: none;
    vertical-align: middle;
    line-height: 35px;
  }

  & > div > a.active {
    background-color: #f8faf7;
    color: #0042b2;
    font-weight: bold;
  }
`;

export const NiceSelect = styled.div`

  & > select {
    -webkit-appearance: none;
    -moz-appearance: none;
    -ms-appearance: none;
    appearance: none;
    outline: 0;
    box-shadow: none;
    background-image: none;
    background-color: white;

    flex: 1;
    padding: 0.5em 1em;
    cursor: pointer;
  }

  position: relative;
  display: flex;
  width: 10em;
  overflow: hidden;
  border-radius: .25em;

  &::after {
    content: '\u25BC';
    position: absolute;
    top: 0;
    right: 0;
    padding: 0.5em 1em;
    cursor: pointer;
    pointer-events: none;
    -webkit-transition: .25s all ease;
    -o-transition: .25s all ease;
    transition: .25s all ease;
  }

  &:hover::after {
    /* color: #f39c12; */
  }

  &::-ms-expand {
    display: none;
  }
`

export const Outlined = styled.div`
  border: 2px solid #388e3c;
  padding: 0.5em 1em;
  width: fit-content;
  border-radius: 2px;
  color: #388e3c;
`

/* { width: "1.5em", height: "1.5em", verticalAlign: "middle" } */
export const CheckboxSuccess = styled.input`
  vertical-align: center;

`

export const TermsSection = styled.a`
  border: 1px solid black;
  border-radius: 5px;
  padding: 1em;
  margin-top: 2px;
  margin-bottom: 2px;
  text-decoration: none;
  color: inherit;
  flex-direction: column;
  
  display: flex;
  &[data-open="true"] {
    display: flex; 
  }
  &[data-open="false"] > *:not(:first-child) {
    display: none; 
  }

  header {
    display: flex;
    flex-direction: row;
    font-weight: bold;
    justify-content: space-between;
    height: auto;
  }

  &[data-open="true"] header:after  {
    content: '\\2227';
  }
  &[data-open="false"] header:after  {
    content: '\\2228';
  }
`;

export const TermsOfService = styled.div`
  display: flex;
  flex-direction: column;
  text-align: left;
  max-width: 500px;

  & > header {
    text-align: center;
    font-size: 2em;
  }

  a {
    text-decoration: none;
    color: inherit;
    flex-direction: column;
  }

  & > a {
    border: 1px solid black;
    border-radius: 5px;
    padding: 1em;
    margin-top: 2px;
    margin-bottom: 2px;
    
    display: flex;
    &[data-open="true"] {
      display: flex; 
    }
    &[data-open="false"] > *:not(:first-child) {
      display: none; 
    }

    header {
      display: flex;
      flex-direction: row;
      font-weight: bold;
      justify-content: space-between;
      height: auto;
    }

    &[data-open="true"] > header:after  {
      content: '\\2227';
    }
    &[data-open="false"] > header:after  {
      content: '\\2228';
    }
  }

`
export const StyledCheckboxLabel = styled.div`
  color: green;
  text-transform: uppercase;
  /* font-weight: bold; */
  text-align: center;
  span {

    input {
      display: none;
      opacity: 0;
      width: 1em;
      height: 1em;
    }
    div {
      display: inline-grid;
      width: 1em;
      height: 1em;
      margin-right: 1em;
      border-radius: 2px;
      border: 2px solid currentColor;
  
      svg {
        transition: transform 0.1s ease-in 25ms;
        transform: scale(0);
        transform-origin: bottom left;
      }
    }
    label {
      padding: 0px;
      font-size: small;
    }
  }

  input:checked + div svg {
    transform: scale(1);
  }
  input:disabled + div {
    color: #959495;
  };
  input:disabled + div + label {
    color: #959495;
  };
  input:focus + div + label {
    box-shadow: 0 0 0 0.05em #fff, 0 0 0.15em 0.1em currentColor;
  }

`