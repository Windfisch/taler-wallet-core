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

import { renderHook } from "@testing-library/preact-hooks";
import { ComponentChildren, h, VNode } from "preact";
import { act } from "preact/test-utils";
import { BackendContextProvider } from "../../src/context/backend.js";
import { InstanceContextProvider } from "../../src/context/instance.js";
import { MerchantBackend } from "../../src/declaration.js";
import {
  useAdminAPI,
  useInstanceAPI,
  useManagementAPI,
} from "../../src/hooks/instance.js";
import {
  API_CREATE_INSTANCE,
  API_GET_CURRENT_INSTANCE,
  API_UPDATE_CURRENT_INSTANCE_AUTH,
  API_UPDATE_INSTANCE_AUTH_BY_ID,
  assertJustExpectedRequestWereMade,
  AxiosMockEnvironment,
} from "../axiosMock.js";

interface TestingContextProps {
  children?: ComponentChildren;
}

function TestingContext({ children }: TestingContextProps): VNode {
  return (
    <BackendContextProvider defaultUrl="http://backend" initialToken="token">
      {children}
    </BackendContextProvider>
  );
}
function AdminTestingContext({ children }: TestingContextProps): VNode {
  return (
    <BackendContextProvider defaultUrl="http://backend" initialToken="token">
      <InstanceContextProvider
        value={{
          token: "token",
          id: "default",
          admin: true,
          changeToken: () => null,
        }}
      >
        {children}
      </InstanceContextProvider>
    </BackendContextProvider>
  );
}

describe("backend context api ", () => {
  it("should use new token after updating the instance token in the settings as user", async () => {
    const env = new AxiosMockEnvironment();

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const instance = useInstanceAPI();
        const management = useManagementAPI("default");
        const admin = useAdminAPI();

        return { instance, management, admin };
      },
      { wrapper: TestingContext }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }

    env.addRequestExpectation(API_UPDATE_INSTANCE_AUTH_BY_ID("default"), {
      request: {
        method: "token",
        token: "another_token",
      },
      response: {
        name: "instance_name",
      } as MerchantBackend.Instances.QueryInstancesResponse,
    });

    await act(async () => {
      await result.current?.management.setNewToken("another_token");
    });

    // await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_CREATE_INSTANCE, {
      auth: "Bearer another_token",
      request: {
        id: "new_instance_id",
      } as MerchantBackend.Instances.InstanceConfigurationMessage,
    });

    result.current.admin.createInstance({
      id: "new_instance_id",
    } as MerchantBackend.Instances.InstanceConfigurationMessage);

    assertJustExpectedRequestWereMade(env);
  });

  it("should use new token after updating the instance token in the settings as admin", async () => {
    const env = new AxiosMockEnvironment();

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const instance = useInstanceAPI();
        const management = useManagementAPI("default");
        const admin = useAdminAPI();

        return { instance, management, admin };
      },
      { wrapper: AdminTestingContext }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }

    env.addRequestExpectation(API_UPDATE_CURRENT_INSTANCE_AUTH, {
      request: {
        method: "token",
        token: "another_token",
      },
      response: {
        name: "instance_name",
      } as MerchantBackend.Instances.QueryInstancesResponse,
    });

    await act(async () => {
      await result.current?.instance.setNewToken("another_token");
    });

    // await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_CREATE_INSTANCE, {
      auth: "Bearer another_token",
      request: {
        id: "new_instance_id",
      } as MerchantBackend.Instances.InstanceConfigurationMessage,
    });

    result.current.admin.createInstance({
      id: "new_instance_id",
    } as MerchantBackend.Instances.InstanceConfigurationMessage);

    assertJustExpectedRequestWereMade(env);
  });
});
