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

import { CoreApiResponse } from "@gnu-taler/taler-util";
import { MessageFromBackend, PlatformAPI } from "./api.js";

const frames = ["popup", "wallet"]

const api: PlatformAPI = ({
  isFirefox: () => false,
  findTalerUriInActiveTab: async () => undefined,
  containsTalerHeaderListener: () => { return true },
  getPermissionsApi: () => ({
    addPermissionsListener: () => undefined, containsHostPermissions: async () => true, removeHostPermissions: async () => false, requestHostPermissions: async () => false
  }),
  getWalletVersion: () => ({
    version: 'none'
  }),
  notifyWhenAppIsReady: (fn: () => void) => {
    let total = frames.length
    function waitAndNotify(): void {
      total--
      if (total < 1) {
        console.log('done')
        fn()
      }
    }
    frames.forEach(f => {
      const theFrame = window.frames[f as any]
      if (theFrame.location.href === 'about:blank') {
        waitAndNotify()
      } else {
        theFrame.addEventListener("load", waitAndNotify)
      }
    })
  },

  openWalletPage: (page: string) => {
    window.frames['wallet' as any].location = `/wallet.html#${page}`
  },
  openWalletPageFromPopup: (page: string) => {
    window.parent.frames['wallet' as any].location = `/wallet.html#${page}`
    window.location.href = "about:blank"
  },
  openWalletURIFromPopup: (page: string) => {
    alert('openWalletURIFromPopup not implemented yet')
  },
  redirectTabToWalletPage: (tabId: number, page: string) => {
    alert('redirectTabToWalletPage not implemented yet')
  },

  registerAllIncomingConnections: () => undefined,
  registerOnInstalled: (fn: () => void) => undefined,
  registerReloadOnNewVersion: () => undefined,
  registerTalerHeaderListener: () => undefined,

  useServiceWorkerAsBackgroundProcess: () => false,

  listenToAllChannels: (fn: (m: any, s: any, c: (r: CoreApiResponse) => void) => void) => {
    window.addEventListener("message", (event: MessageEvent<IframeMessageType>) => {
      if (event.data.type !== 'command') return
      const sender = event.data.header.replyMe
      fn(event.data.body, sender, (resp: CoreApiResponse) => {
        if (event.source) {
          const msg: IframeMessageResponse = {
            type: "response",
            header: { responseId: sender },
            body: resp
          }
          window.parent.postMessage(msg)
        }
      })
    })
  },
  sendMessageToAllChannels: (message: MessageFromBackend) => {
    Array.from(window.frames).forEach(w => {
      try {
        w.postMessage({
          header: {}, body: message
        });
      } catch (e) {
        console.error(e)
      }
    })
  },
  listenToWalletBackground: (onNewMessage: (m: MessageFromBackend) => void) => {
    function listener(event: MessageEvent<IframeMessageType>): void {
      if (event.data.type !== 'notification') return
      onNewMessage(event.data.body)
    }
    window.parent.addEventListener("message", listener)
    return () => {
      window.parent.removeEventListener("message", listener)
    }
  },
  sendMessageToWalletBackground: async (operation: string, payload: any) => {
    const replyMe = `reply-${Math.floor(Math.random() * 100000)}`
    const message: IframeMessageCommand = {
      type: 'command',
      header: { replyMe },
      body: { operation, payload, id: "(none)" }
    }
    window.parent.postMessage(message)

    return new Promise((res, rej) => {
      function listener(event: MessageEvent<IframeMessageType>): void {
        if (event.data.type !== "response" || event.data.header.responseId !== replyMe) {
          return
        }
        res(event.data.body)
        window.parent.removeEventListener("message", listener)
      }
      window.parent.addEventListener("message", listener, {

      })
    })

  },
})

type IframeMessageType = IframeMessageNotification | IframeMessageResponse | IframeMessageCommand;
interface IframeMessageNotification {
  type: "notification";
  header: Record<string, never>,
  body: MessageFromBackend
}
interface IframeMessageResponse {
  type: "response";
  header: {
    responseId: string;
  },
  body: CoreApiResponse
}

interface IframeMessageCommand {
  type: "command";
  header: {
    replyMe: string;
  },
  body: {
    operation: any, id: string, payload: any
  }
}

export default api;

