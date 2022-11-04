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

import { renderHook, act } from '@testing-library/preact-hooks';
import { useListener } from "../../src/hooks/listener.js";

// jest.useFakeTimers()

test('listener', async () => {


  function createSomeString() {
    return "hello"
  }
  async function addWorldToTheEnd(resultFromComponentB: string) {
    return `${resultFromComponentB} world`
  }
  const expectedResult = "hello world"

  const { result } = renderHook(() => useListener(addWorldToTheEnd))

  expect(result.current).toBeDefined()
  if (!result.current) {
    return;
  }

  {
    const [activator, subscriber] = result.current
    expect(activator).toBeUndefined()

    act(() => {
      subscriber(createSomeString)
    })

  }

  const [activator] = result.current
  expect(activator).toBeDefined()
  if (!activator) return;

  const response = await activator()
  expect(response).toBe(expectedResult)

});
