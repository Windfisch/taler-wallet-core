/*
 This file is part of GNU Taler
 (C) 2021-2023 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { renderHook } from "@testing-library/preact-hooks"
import { useAsync } from "../../src/hooks/async.js"

/**
*
* @author Sebastian Javier Marchano (sebasjm)
*/
test("async function is called", async () => {
  jest.useFakeTimers()

  const timeout = 500

  const asyncFunction = jest.fn(() => new Promise((res) => {
    setTimeout(() => {
      res({ the_answer: 'yes' })
    }, timeout);
  }))

  const { result, waitForNextUpdate } = renderHook(() => {
    return useAsync(asyncFunction)
  })

  expect(result.current?.isLoading).toBeFalsy()

  result.current?.request()
  expect(asyncFunction).toBeCalled()
  await waitForNextUpdate({ timeout: 1 })
  expect(result.current?.isLoading).toBeTruthy()

  jest.advanceTimersByTime(timeout + 1)
  await waitForNextUpdate({ timeout: 1 })
  expect(result.current?.isLoading).toBeFalsy()
  expect(result.current?.data).toMatchObject({ the_answer: 'yes' })
  expect(result.current?.error).toBeUndefined()
  expect(result.current?.isSlow).toBeFalsy()
})

test("async function return error if rejected", async () => {
  jest.useFakeTimers()

  const timeout = 500

  const asyncFunction = jest.fn(() => new Promise((_, rej) => {
    setTimeout(() => {
      rej({ the_error: 'yes' })
    }, timeout);
  }))

  const { result, waitForNextUpdate } = renderHook(() => {
    return useAsync(asyncFunction)
  })

  expect(result.current?.isLoading).toBeFalsy()

  result.current?.request()
  expect(asyncFunction).toBeCalled()
  await waitForNextUpdate({ timeout: 1 })
  expect(result.current?.isLoading).toBeTruthy()

  jest.advanceTimersByTime(timeout + 1)
  await waitForNextUpdate({ timeout: 1 })
  expect(result.current?.isLoading).toBeFalsy()
  expect(result.current?.error).toMatchObject({ the_error: 'yes' })
  expect(result.current?.data).toBeUndefined()
  expect(result.current?.isSlow).toBeFalsy()
})

test("async function is slow", async () => {
  jest.useFakeTimers()

  const timeout = 2200

  const asyncFunction = jest.fn(() => new Promise((res) => {
    setTimeout(() => {
      res({ the_answer: 'yes' })
    }, timeout);
  }))

  const { result, waitForNextUpdate } = renderHook(() => {
    return useAsync(asyncFunction)
  })

  expect(result.current?.isLoading).toBeFalsy()

  result.current?.request()
  expect(asyncFunction).toBeCalled()
  await waitForNextUpdate({ timeout: 1 })
  expect(result.current?.isLoading).toBeTruthy()

  jest.advanceTimersByTime(timeout / 2)
  await waitForNextUpdate({ timeout: 1 })
  expect(result.current?.isLoading).toBeTruthy()
  expect(result.current?.isSlow).toBeTruthy()
  expect(result.current?.data).toBeUndefined()
  expect(result.current?.error).toBeUndefined()

  jest.advanceTimersByTime(timeout / 2)
  await waitForNextUpdate({ timeout: 1 })
  expect(result.current?.isLoading).toBeFalsy()
  expect(result.current?.data).toMatchObject({ the_answer: 'yes' })
  expect(result.current?.error).toBeUndefined()
  expect(result.current?.isSlow).toBeFalsy()

})

test("async function is cancellable", async () => {
  jest.useFakeTimers()

  const timeout = 2200

  const asyncFunction = jest.fn(() => new Promise((res) => {
    setTimeout(() => {
      res({ the_answer: 'yes' })
    }, timeout);
  }))

  const { result, waitForNextUpdate } = renderHook(() => {
    return useAsync(asyncFunction)
  })

  expect(result.current?.isLoading).toBeFalsy()

  result.current?.request()
  expect(asyncFunction).toBeCalled()
  await waitForNextUpdate({ timeout: 1 })
  expect(result.current?.isLoading).toBeTruthy()

  jest.advanceTimersByTime(timeout / 2)
  await waitForNextUpdate({ timeout: 1 })
  expect(result.current?.isLoading).toBeTruthy()
  expect(result.current?.isSlow).toBeTruthy()
  expect(result.current?.data).toBeUndefined()
  expect(result.current?.error).toBeUndefined()

  result.current?.cancel()
  await waitForNextUpdate({ timeout: 1 })
  expect(result.current?.isLoading).toBeFalsy()
  expect(result.current?.data).toBeUndefined()
  expect(result.current?.error).toBeUndefined()
  expect(result.current?.isSlow).toBeFalsy()

})
