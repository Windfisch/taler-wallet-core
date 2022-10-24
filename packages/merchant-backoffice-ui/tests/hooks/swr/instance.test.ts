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
import { act } from "preact/test-utils";
import { MerchantBackend } from "../../../src/declaration";
import { useAdminAPI, useBackendInstances, useInstanceAPI, useInstanceDetails, useManagementAPI } from "../../../src/hooks/instance";
import {
  API_CREATE_INSTANCE,
  API_DELETE_INSTANCE,
  API_GET_CURRENT_INSTANCE,
  API_LIST_INSTANCES,
  API_UPDATE_CURRENT_INSTANCE,
  API_UPDATE_CURRENT_INSTANCE_AUTH,
  API_UPDATE_INSTANCE_AUTH_BY_ID,
  API_UPDATE_INSTANCE_BY_ID,
  assertJustExpectedRequestWereMade,
  AxiosMockEnvironment
} from "../../axiosMock";
import { TestingContext } from "./index";

describe("instance api interaction with details ", () => {

  it("should evict cache when updating an instance", async () => {

    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_GET_CURRENT_INSTANCE, {
      response: {
        name: 'instance_name'
      } as MerchantBackend.Instances.QueryInstancesResponse,
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const api = useInstanceAPI();
        const query = useInstanceDetails();

        return { query, api };
      },
      { wrapper: TestingContext }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }
    expect(result.current.query.loading).toBeTruthy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();

    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      name: 'instance_name'
    });

    env.addRequestExpectation(API_UPDATE_CURRENT_INSTANCE, {
      request: {
        name: 'other_name'
      } as MerchantBackend.Instances.InstanceReconfigurationMessage,
    });

    act(async () => {
      await result.current?.api.updateInstance({
        name: 'other_name'
      } as MerchantBackend.Instances.InstanceReconfigurationMessage);
    });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_GET_CURRENT_INSTANCE, {
      response: {
        name: 'other_name'
      } as MerchantBackend.Instances.QueryInstancesResponse,
    });

    expect(result.current.query.loading).toBeFalsy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();

    expect(result.current.query.data).toEqual({
      name: 'other_name'
    });
  });

  it("should evict cache when setting the instance's token", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_GET_CURRENT_INSTANCE, {
      response: {
        name: 'instance_name',
        auth: {
          method: 'token',
          token: 'not-secret',
        }
      } as MerchantBackend.Instances.QueryInstancesResponse,
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const api = useInstanceAPI();
        const query = useInstanceDetails();

        return { query, api };
      },
      { wrapper: TestingContext }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }
    expect(result.current.query.loading).toBeTruthy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();

    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      name: 'instance_name',
      auth: {
        method: 'token',
        token: 'not-secret',
      }
    });

    env.addRequestExpectation(API_UPDATE_CURRENT_INSTANCE_AUTH, {
      request: {
        method: 'token',
        token: 'secret'
      } as MerchantBackend.Instances.InstanceAuthConfigurationMessage,
    });

    act(async () => {
      await result.current?.api.setNewToken('secret');
    });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_GET_CURRENT_INSTANCE, {
      response: {
        name: 'instance_name',
        auth: {
          method: 'token',
          token: 'secret',
        }
      } as MerchantBackend.Instances.QueryInstancesResponse,
    });

    expect(result.current.query.loading).toBeFalsy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();

    expect(result.current.query.data).toEqual({
      name: 'instance_name',
      auth: {
        method: 'token',
        token: 'secret',
      }
    });
  });

  it("should evict cache when clearing the instance's token", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_GET_CURRENT_INSTANCE, {
      response: {
        name: 'instance_name',
        auth: {
          method: 'token',
          token: 'not-secret',
        }
      } as MerchantBackend.Instances.QueryInstancesResponse,
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const api = useInstanceAPI();
        const query = useInstanceDetails();

        return { query, api };
      },
      { wrapper: TestingContext }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }
    expect(result.current.query.loading).toBeTruthy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();

    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      name: 'instance_name',
      auth: {
        method: 'token',
        token: 'not-secret',
      }
    });

    env.addRequestExpectation(API_UPDATE_CURRENT_INSTANCE_AUTH, {
      request: {
        method: 'external',
      } as MerchantBackend.Instances.InstanceAuthConfigurationMessage,
    });

    act(async () => {
      await result.current?.api.clearToken();
    });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_GET_CURRENT_INSTANCE, {
      response: {
        name: 'instance_name',
        auth: {
          method: 'external',
        }
      } as MerchantBackend.Instances.QueryInstancesResponse,
    });

    expect(result.current.query.loading).toBeFalsy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();

    expect(result.current.query.data).toEqual({
      name: 'instance_name',
      auth: {
        method: 'external',
      }
    });
  });
});

describe("instance admin api interaction with listing ", () => {

  it("should evict cache when creating a new instance", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_INSTANCES, {
      response: {
        instances: [{
          name: 'instance_name'
        } as MerchantBackend.Instances.Instance]
      },
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const api = useAdminAPI();
        const query = useBackendInstances();

        return { query, api };
      },
      { wrapper: TestingContext }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }
    expect(result.current.query.loading).toBeTruthy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();

    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      instances: [{
        name: 'instance_name'
      }]
    });

    env.addRequestExpectation(API_CREATE_INSTANCE, {
      request: {
        name: 'other_name'
      } as MerchantBackend.Instances.InstanceConfigurationMessage,
    });

    act(async () => {
      await result.current?.api.createInstance({
        name: 'other_name'
      } as MerchantBackend.Instances.InstanceConfigurationMessage);
    });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_LIST_INSTANCES, {
      response: {
        instances: [{
          name: 'instance_name'
        } as MerchantBackend.Instances.Instance,
        {
          name: 'other_name'
        } as MerchantBackend.Instances.Instance]
      },
    });

    expect(result.current.query.loading).toBeFalsy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();

    expect(result.current.query.data).toEqual({
      instances: [{
        name: 'instance_name'
      }, {
        name: 'other_name'
      }]
    });
  });

  it("should evict cache when deleting an instance", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_INSTANCES, {
      response: {
        instances: [{
          id: 'default',
          name: 'instance_name'
        } as MerchantBackend.Instances.Instance,
        {
          id: 'the_id',
          name: 'second_instance'
        } as MerchantBackend.Instances.Instance]
      },
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const api = useAdminAPI();
        const query = useBackendInstances();

        return { query, api };
      },
      { wrapper: TestingContext }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }
    expect(result.current.query.loading).toBeTruthy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();

    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      instances: [{
        id: 'default',
        name: 'instance_name'
      }, {
        id: 'the_id',
        name: 'second_instance'
      }]
    });

    env.addRequestExpectation(API_DELETE_INSTANCE('the_id'), {});

    act(async () => {
      await result.current?.api.deleteInstance('the_id');
    });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_LIST_INSTANCES, {
      response: {
        instances: [{
          id: 'default',
          name: 'instance_name'
        } as MerchantBackend.Instances.Instance]
      },
    });

    expect(result.current.query.loading).toBeFalsy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();

    expect(result.current.query.data).toEqual({
      instances: [{
        id: 'default',
        name: 'instance_name'
      }]
    });
  });
  it("should evict cache when deleting (purge) an instance", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_INSTANCES, {
      response: {
        instances: [{
          id: 'default',
          name: 'instance_name'
        } as MerchantBackend.Instances.Instance,
        {
          id: 'the_id',
          name: 'second_instance'
        } as MerchantBackend.Instances.Instance]
      },
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const api = useAdminAPI();
        const query = useBackendInstances();

        return { query, api };
      },
      { wrapper: TestingContext }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }
    expect(result.current.query.loading).toBeTruthy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();

    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      instances: [{
        id: 'default',
        name: 'instance_name'
      }, {
        id: 'the_id',
        name: 'second_instance'
      }]
    });

    env.addRequestExpectation(API_DELETE_INSTANCE('the_id'), {
      qparam: {
        purge: 'YES'
      }
    });

    act(async () => {
      await result.current?.api.purgeInstance('the_id');
    });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_LIST_INSTANCES, {
      response: {
        instances: [{
          id: 'default',
          name: 'instance_name'
        } as MerchantBackend.Instances.Instance]
      },
    });

    expect(result.current.query.loading).toBeFalsy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();

    expect(result.current.query.data).toEqual({
      instances: [{
        id: 'default',
        name: 'instance_name'
      }]
    });
  });
});

describe("instance management api interaction with listing ", () => {

  it("should evict cache when updating an instance", async () => {
    const env = new AxiosMockEnvironment();

    env.addRequestExpectation(API_LIST_INSTANCES, {
      response: {
        instances: [{
          id: 'managed',
          name: 'instance_name'
        } as MerchantBackend.Instances.Instance]
      },
    });

    const { result, waitForNextUpdate } = renderHook(
      () => {
        const api = useManagementAPI('managed');
        const query = useBackendInstances();

        return { query, api };
      },
      { wrapper: TestingContext }
    );

    if (!result.current) {
      expect(result.current).toBeDefined();
      return;
    }
    expect(result.current.query.loading).toBeTruthy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();

    expect(result.current?.query.ok).toBeTruthy();
    if (!result.current?.query.ok) return;

    expect(result.current.query.data).toEqual({
      instances: [{
        id: 'managed',
        name: 'instance_name'
      }]
    });

    env.addRequestExpectation(API_UPDATE_INSTANCE_BY_ID('managed'), {
      request: {
        name: 'other_name'
      } as MerchantBackend.Instances.InstanceReconfigurationMessage,
    });

    act(async () => {
      await result.current?.api.updateInstance({
        name: 'other_name'
      } as MerchantBackend.Instances.InstanceConfigurationMessage);
    });

    assertJustExpectedRequestWereMade(env);

    env.addRequestExpectation(API_LIST_INSTANCES, {
      response: {
        instances: [
          {
            id: 'managed',
            name: 'other_name'
          } as MerchantBackend.Instances.Instance]
      },
    });

    expect(result.current.query.loading).toBeFalsy();

    await waitForNextUpdate({ timeout: 1 });

    assertJustExpectedRequestWereMade(env);

    expect(result.current.query.loading).toBeFalsy();
    expect(result.current.query.ok).toBeTruthy();

    expect(result.current.query.data).toEqual({
      instances: [{
        id: 'managed',
        name: 'other_name'
      }]
    });
  });

});

