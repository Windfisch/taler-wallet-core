import { h, Fragment, VNode } from "preact";
import { useState } from "preact/hooks";
import { QR } from "../components/QR";
import { ButtonBox, FontIcon, WalletBox } from "../components/styled";
export interface Props {
  reservePub: string;
  paytos: string[];
  onBack: () => void;
}

export function ReserveCreated({ reservePub, paytos, onBack }: Props): VNode {
  const [opened, setOpened] = useState(-1);
  return (
    <WalletBox>
      <section>
        <h2>Reserve created!</h2>
        <p>
          Now you need to send money to the exchange to one of the following
          accounts
        </p>
        <p>
          To complete the setup of the reserve, you must now initiate a wire
          transfer using the given wire transfer subject and crediting the
          specified amount to the indicated account of the exchange.
        </p>
      </section>
      <section>
        <ul>
          {paytos.map((href, idx) => {
            const url = new URL(href);
            return (
              <li key={idx}>
                <p>
                  <a
                    href=""
                    onClick={(e) => {
                      setOpened((o) => (o === idx ? -1 : idx));
                      e.preventDefault();
                    }}
                  >
                    {url.pathname}
                  </a>
                  {opened === idx && (
                    <Fragment>
                      <p>
                        If your system supports RFC 8905, you can do this by
                        opening <a href={href}>this URI</a> or scan the QR with
                        your wallet
                      </p>
                      <QR text={href} />
                    </Fragment>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
      <footer>
        <ButtonBox onClick={onBack}>
          <FontIcon>&#x2190;</FontIcon>
        </ButtonBox>
        <div />
      </footer>
    </WalletBox>
  );
}
