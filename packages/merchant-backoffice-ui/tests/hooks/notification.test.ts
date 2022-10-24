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

import { renderHook, act} from '@testing-library/preact-hooks';
import { useNotifications } from '../../src/hooks/notifications';

jest.useFakeTimers()

test('notification should disapear after timeout', () => {
  jest.spyOn(global, 'setTimeout');

  const timeout = 1000
  const { result, rerender } = renderHook(() => useNotifications(undefined, timeout));

  expect(result.current?.notifications.length).toBe(0);

  act(() => {
    result.current?.pushNotification({
      message: 'some_id',
      type: 'INFO'
    });
  });
  expect(result.current?.notifications.length).toBe(1);

  jest.advanceTimersByTime(timeout/2);
  rerender()
  expect(result.current?.notifications.length).toBe(1);

  jest.advanceTimersByTime(timeout);
  rerender()
  expect(result.current?.notifications.length).toBe(0);

});
