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

import { FunctionalComponent, h } from "preact";
import { useEffect, useState } from "preact/hooks";

interface Props {
  user: string;
}

const Profile: FunctionalComponent<Props> = (props: Props) => {
  const { user } = props;
  const [time, setTime] = useState<number>(Date.now());
  const [count, setCount] = useState<number>(0);

  // gets called when this route is navigated to
  useEffect(() => {
    const timer = window.setInterval(() => setTime(Date.now()), 1000);

    // gets called just before navigating away from the route
    return (): void => {
      clearInterval(timer);
    };
  }, []);

  // update the current time
  const increment = (): void => {
    setCount(count + 1);
  };

  return (
    <div>
      <h1>Profile: {user}</h1>
      <p>This is the user profile for a user named {user}.</p>

      <div>Current time: {new Date(time).toLocaleString()}</div>

      <p>
        <button onClick={increment}>Click Me</button> Clicked {count} times.
      </p>
    </div>
  );
};

export default Profile;
