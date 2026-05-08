/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

/* eslint-disable no-useless-catch */

// constants
import { API_BASE_URL } from "@plane/constants";
// types
import type { ICustomField, ICustomFieldFormData, ICustomFieldValue, ICustomFieldValuePayload } from "@plane/types";
// services
import { APIService } from "@/services/api.service";

export class CustomFieldService extends APIService {
  constructor() {
    super(API_BASE_URL);
  }

  // ── Field definitions ──────────────────────────────────────────────────────

  async getCustomFields(workspaceSlug: string, projectId: string, typeId: string): Promise<ICustomField[]> {
    try {
      const { data } = await this.get(
        `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${typeId}/custom-fields/`
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async createCustomField(
    workspaceSlug: string,
    projectId: string,
    typeId: string,
    payload: ICustomFieldFormData
  ): Promise<ICustomField> {
    try {
      const { data } = await this.post(
        `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${typeId}/custom-fields/`,
        payload
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async updateCustomField(
    workspaceSlug: string,
    projectId: string,
    typeId: string,
    fieldId: string,
    payload: Partial<ICustomFieldFormData>
  ): Promise<ICustomField> {
    try {
      const { data } = await this.patch(
        `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${typeId}/custom-fields/${fieldId}/`,
        payload
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async deleteCustomField(
    workspaceSlug: string,
    projectId: string,
    typeId: string,
    fieldId: string
  ): Promise<void> {
    try {
      await this.delete(
        `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${typeId}/custom-fields/${fieldId}/`
      );
    } catch (error) {
      throw error;
    }
  }

  async reorderCustomFields(
    workspaceSlug: string,
    projectId: string,
    typeId: string,
    orderedIds: string[]
  ): Promise<void> {
    try {
      await this.post(
        `/api/workspaces/${workspaceSlug}/projects/${projectId}/work-item-types/${typeId}/custom-fields/reorder/`,
        { ordered_ids: orderedIds }
      );
    } catch (error) {
      throw error;
    }
  }

  // ── Field values ───────────────────────────────────────────────────────────

  async getIssueCustomFieldValues(
    workspaceSlug: string,
    projectId: string,
    issueId: string
  ): Promise<ICustomFieldValue[]> {
    try {
      const { data } = await this.get(
        `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/custom-field-values/`
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async saveIssueCustomFieldValues(
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    values: ICustomFieldValuePayload[]
  ): Promise<ICustomFieldValue[]> {
    try {
      const { data } = await this.post(
        `/api/workspaces/${workspaceSlug}/projects/${projectId}/issues/${issueId}/custom-field-values/`,
        values
      );
      return data;
    } catch (error) {
      throw error;
    }
  }
}

const customFieldService = new CustomFieldService();
export default customFieldService;
