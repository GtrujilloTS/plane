/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { set } from "lodash-es";
import { action, makeObservable, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
// types
import type { IWorkItemType, IWorkItemTypeFormData } from "@plane/types";
// services
import { WorkItemTypeService } from "@/services/work-item-type.service";
// store
import type { CoreRootStore } from "./root.store";

export interface IWorkItemTypeStore {
  // observables
  workItemTypeMap: Record<string, IWorkItemType>;
  fetchedMap: Record<string, boolean>;
  projectWorkItemTypeIds: Record<string, string[]>;
  // computed functions
  getProjectWorkItemTypes: (projectId: string) => IWorkItemType[] | undefined;
  getWorkItemTypeById: (workItemTypeId: string) => IWorkItemType | null;
  // fetch actions
  fetchWorkItemTypes: (workspaceSlug: string, projectId: string) => Promise<IWorkItemType[]>;
  // crud actions
  createWorkItemType: (
    workspaceSlug: string,
    projectId: string,
    data: IWorkItemTypeFormData
  ) => Promise<IWorkItemType>;
  updateWorkItemType: (
    workspaceSlug: string,
    projectId: string,
    workItemTypeId: string,
    data: Partial<IWorkItemTypeFormData>
  ) => Promise<IWorkItemType>;
  deleteWorkItemType: (workspaceSlug: string, projectId: string, workItemTypeId: string) => Promise<void>;
}

export class WorkItemTypeStore implements IWorkItemTypeStore {
  rootStore;
  workItemTypeMap: Record<string, IWorkItemType> = {};
  fetchedMap: Record<string, boolean> = {};
  // projectId → list of workItemType ids
  projectWorkItemTypeIds: Record<string, string[]> = {};
  workItemTypeService;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      workItemTypeMap: observable,
      fetchedMap: observable,
      projectWorkItemTypeIds: observable,
      fetchWorkItemTypes: action,
      createWorkItemType: action,
      updateWorkItemType: action,
      deleteWorkItemType: action,
    });

    this.rootStore = _rootStore;
    this.workItemTypeService = new WorkItemTypeService();
  }

  getProjectWorkItemTypes = computedFn((projectId: string): IWorkItemType[] | undefined => {
    if (!this.fetchedMap[projectId]) return undefined;
    const ids = this.projectWorkItemTypeIds[projectId] ?? [];
    return ids.map((id) => this.workItemTypeMap[id]).filter(Boolean);
  });

  getWorkItemTypeById = computedFn((workItemTypeId: string): IWorkItemType | null =>
    this.workItemTypeMap[workItemTypeId] ?? null
  );

  fetchWorkItemTypes = async (workspaceSlug: string, projectId: string) => {
    const response = await this.workItemTypeService.fetchWorkItemTypes(workspaceSlug, projectId);
    runInAction(() => {
      const ids: string[] = [];
      response.forEach((type) => {
        set(this.workItemTypeMap, [type.id], type);
        ids.push(type.id);
      });
      set(this.projectWorkItemTypeIds, projectId, ids);
      set(this.fetchedMap, projectId, true);
    });
    return response;
  };

  createWorkItemType = async (workspaceSlug: string, projectId: string, data: IWorkItemTypeFormData) => {
    const response = await this.workItemTypeService.createWorkItemType(workspaceSlug, projectId, data);
    runInAction(() => {
      set(this.workItemTypeMap, [response.id], response);
      const existing = this.projectWorkItemTypeIds[projectId] ?? [];
      set(this.projectWorkItemTypeIds, projectId, [...existing, response.id]);
    });
    return response;
  };

  updateWorkItemType = async (
    workspaceSlug: string,
    projectId: string,
    workItemTypeId: string,
    data: Partial<IWorkItemTypeFormData>
  ) => {
    const original = this.workItemTypeMap[workItemTypeId];
    try {
      runInAction(() => {
        set(this.workItemTypeMap, [workItemTypeId], { ...original, ...data });
      });
      const response = await this.workItemTypeService.updateWorkItemType(
        workspaceSlug,
        projectId,
        workItemTypeId,
        data
      );
      return response;
    } catch (error) {
      runInAction(() => {
        set(this.workItemTypeMap, [workItemTypeId], original);
      });
      throw error;
    }
  };

  deleteWorkItemType = async (workspaceSlug: string, projectId: string, workItemTypeId: string) => {
    await this.workItemTypeService.deleteWorkItemType(workspaceSlug, projectId, workItemTypeId);
    runInAction(() => {
      delete this.workItemTypeMap[workItemTypeId];
      const existing = this.projectWorkItemTypeIds[projectId] ?? [];
      set(
        this.projectWorkItemTypeIds,
        projectId,
        existing.filter((id) => id !== workItemTypeId)
      );
    });
  };
}
