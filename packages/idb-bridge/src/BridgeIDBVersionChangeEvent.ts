/*
  Copyright 2019 Florian Dold
  Copyright 2017 Jeremy Scheff

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
  or implied. See the License for the specific language governing
  permissions and limitations under the License.
 */

import FakeEvent from "./util/FakeEvent";

class BridgeIDBVersionChangeEvent extends FakeEvent {
    public newVersion: number | null;
    public oldVersion: number;

    constructor(
        type: "blocked" | "success" | "upgradeneeded" | "versionchange",
        parameters: { newVersion?: number | null; oldVersion?: number } = {},
    ) {
        super(type);

        this.newVersion =
            parameters.newVersion !== undefined ? parameters.newVersion : null;
        this.oldVersion =
            parameters.oldVersion !== undefined ? parameters.oldVersion : 0;
    }

    public toString() {
        return "[object IDBVersionChangeEvent]";
    }
}

export default BridgeIDBVersionChangeEvent;
