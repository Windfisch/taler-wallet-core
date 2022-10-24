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

import axios, { AxiosPromise, AxiosRequestConfig } from "axios";

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

export let removeAxiosCancelToken = false;

export let axiosHandler = function doAxiosRequest(config: AxiosRequestConfig): AxiosPromise<any> {
  return axios(config)
}

/**
 * Set this backend library to testing mode.
 * Instead of calling the axios library the @handler will be called
 * 
 * @param handler callback that will mock axios 
 */
export function setAxiosRequestAsTestingEnvironment(handler: AxiosHandler): void {
  removeAxiosCancelToken = true;
  axiosHandler = function defaultTestingHandler(config) {
    const currentHanlder = listOfHandlersToUseOnce.shift()
    if (!currentHanlder) {
      return handler(config)
    }

    return currentHanlder(config)
  }
}

type AxiosHandler = (config: AxiosRequestConfig) => AxiosPromise<any>;
type AxiosArguments = { args: AxiosRequestConfig | undefined }


const listOfHandlersToUseOnce = new Array<AxiosHandler>()

/**
 * 
 * @param handler mock function
 * @returns savedArgs
 */
export function mockAxiosOnce(handler: AxiosHandler): { args: AxiosRequestConfig | undefined } {
  const savedArgs: AxiosArguments = { args: undefined }
  listOfHandlersToUseOnce.push((config: AxiosRequestConfig): AxiosPromise<any> => {
    savedArgs.args = config;
    return handler(config)
  })
  return savedArgs;
}
