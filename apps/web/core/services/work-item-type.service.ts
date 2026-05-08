/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

/* eslint-disable no-useless-catch */

// constants
import { API_BASE_URL } from "@plane/constants";
// types
import type { IWorkItemType, IWorkItemTypeFormData } from "@plane/types";
// services
import { APIService } from "@/services/api.service";

export class WorkItemTypeService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  async fetchWorkItemTypes(workspaceSlug: string, projectId: string): Promise<IWorkItemType[]> {
    try {
      const { data } = await this.get(
        `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/`
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async fetchWorkItemType(
    workspaceSlug: string,
    projectId: string,
    workItemTypeId: string
  ): Promise<IWorkItemType> {
    try {
      const { data } = await this.get(
        `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${workItemTypeId}/`
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async createWorkItemType(
    workspaceSlug: string,
    projectId: string,
    payload: IWorkItemTypeFormData
  ): Promise<IWorkItemType> {
    try {
      const { data } = await this.post(
        `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/`,
        payload
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateWorkItemType(
    workspaceSlug: string,
    projectId: string,
    workItemTypeId: string,
    payload: Partial<IWorkItemTypeFormData>
  ): Promise<IWorkItemType> {
    try {
      const { data } = await this.patch(
        `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${workItemTypeId}/`,
        payload
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async deleteWorkItemType(
    workspaceSlug: string,
    projectId: string,
    workItemTypeId: string
  ): Promise<void> {
    try {
      await this.delete(
        `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${workItemTypeId}/`
      );
    } catch (error) {
      throw error;
    }
  }
}

const workItemTypeService = new WorkItemTypeService();
export default workItemTypeService;
