
// need to import linaria types, otherwise compiler will complain
import type * as Linaria from '@linaria/core';

import { styled } from '@linaria/react';

export const PaymentStatus = styled.span<{ color: string }>`
  padding: 5px;
  border-radius: 5px;
  color: white;
  background-color: ${p => p.color};
`

export const PopupBox = styled.div`
  height: calc(320px - 34px - 16px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;

  & > section {
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
    margin-bottom: 5px;

    & > div {
      align-self: center;
    }
  }

  & > footer {
    padding-top: 5px;
    flex-direction: row;
    justify-content: space-between;
    display: flex;
    & button {
      margin-left: 5px;
    }
  }

`

export const Button = styled.button`
  display: inline-block;
  zoom: 1;
  line-height: normal;
  white-space: nowrap;
  vertical-align: middle;
  text-align: center;
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;

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

const ButtonVariant = styled(Button)`
  color: white;
  border-radius: 4px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
`

export const ButtonPrimary = styled(ButtonVariant)`
  background-color: rgb(66, 184, 221);
`

export const ButtonSuccess = styled(ButtonVariant)`
  background-color: rgb(28, 184, 65);
`

export const ButtonWarning = styled(ButtonVariant)`
  background-color: rgb(223, 117, 20);
`

export const ButtonDestructive = styled(ButtonVariant)`
  background-color: rgb(202, 60, 60);
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

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  margin: 0em 1em;
  justify-content: space-between;
`

export const RowBorderGray = styled(Row)`
  border: 1px solid gray;
  border-radius: 0.5em;
`

export const HistoryRow = styled(RowBorderGray)`
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
export const ExtraLargeText = styled.div`
  font-size: x-large; 
`

export const SmallTextLight = styled(SmallText)`
  color: gray;
`

export const CenteredText = styled.div`
  white-space: nowrap;
  text-align: center;
`

export const CenteredTextBold = styled(CenteredText)`
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

export const ErrorBox = styled.div`
  border: 2px solid #f5c6cb;
  border-radius: 0.25em;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  /* margin: 0.5em; */
  padding-left: 1em;
  padding-right: 1em;
  width: "100%";
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
export const PopupNavigation = styled.div`
  background-color: #033;
  
  & > a {
    color: #f8faf7;
    padding-top: 0.7em;
    display: inline-block;
    width: calc(400px / 5);
    padding-bottom: 0.7em;
    text-align: center;
    text-decoration: none;
  }

  & > a.active {
    background-color: #f8faf7;
    color: #000;
    font-weight: bold;

  }
`
