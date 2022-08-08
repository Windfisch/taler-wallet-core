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

import { styled } from "@linaria/react";
import { ComponentChildren, h, VNode } from "preact";
import { ButtonHandler } from "../mui/handlers.js";
import closeIcon from "../svg/close_24px.svg";
import { Link, LinkPrimary, LinkWarning } from "./styled/index.js";

interface Props {
  children: ComponentChildren;
  onClose: ButtonHandler;
  title: string;
}

const FullSize = styled.div`
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  z-index: 10;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  height: 5%;
  vertical-align: center;
  align-items: center;
`;

const Body = styled.div`
  height: 95%;
`;

export function Modal({ title, children, onClose }: Props): VNode {
  return (
    <FullSize onClick={onClose?.onClick}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          width: 600,
          height: "80%",
          margin: "auto",
          borderRadius: 8,
          padding: 8,
          // overflow: "scroll",
        }}
      >
        <Header>
          <div>
            <h2>{title}</h2>
          </div>
          <Link onClick={onClose?.onClick}>
            <div
              style={{
                height: 24,
                width: 24,
                marginLeft: 4,
                marginRight: 4,
                // fill: "white",
              }}
              dangerouslySetInnerHTML={{ __html: closeIcon }}
            />
          </Link>
        </Header>
        <hr />

        <Body onClick={(e: any) => e.stopPropagation()}>{children}</Body>
      </div>
    </FullSize>
  );
}
