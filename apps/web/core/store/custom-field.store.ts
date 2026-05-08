/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { set } from "lodash-es";
import { action, makeObservable, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
// types
import type { ICustomField, ICustomFieldFormData, ICustomFieldValue, ICustomFieldValuePayload } from "@plane/types";
// services
import { CustomFieldService } from "@/services/custom-field.service";
// store
import type { CoreRootStore } from "./root.store";

export interface ICustomFieldStore {
  // observables
  customFieldsByType: Record<string, ICustomField[]>;
  valuesByIssue: Record<string, ICustomFieldValue[]>;
  isLoading: boolean;
  // computed
  getCustomFieldsByType: (typeId: string) => ICustomField[];
  getValuesByIssue: (issueId: string) => ICustomFieldValue[];
  // actions
  fetchCustomFields: (workspaceSlug: string, projectId: string, typeId: string) => Promise<ICustomField[]>;
  createCustomField: (workspaceSlug: string, projectId: string, typeId: string, data: ICustomFieldFormData) => Promise<ICustomField>;
  updateCustomField: (workspaceSlug: string, projectId: string, typeId: string, fieldId: string, data: Partial<ICustomFieldFormData>) => Promise<ICustomField>;
  deleteCustomField: (workspaceSlug: string, projectId: string, typeId: string, fieldId: string) => Promise<void>;
  reorderCustomFields: (workspaceSlug: string, projectId: string, typeId: string, orderedIds: string[]) => Promise<void>;
  fetchIssueValues: (workspaceSlug: string, projectId: string, issueId: string) => Promise<ICustomFieldValue[]>;
  saveIssueValues: (workspaceSlug: string, projectId: string, issueId: string, values: ICustomFieldValuePayload[]) => Promise<ICustomFieldValue[]>;
}

export class CustomFieldStore implements ICustomFieldStore {
  rootStore;
  customFieldsByType: Record<string, ICustomField[]> = {};
  valuesByIssue: Record<string, ICustomFieldValue[]> = {};
  isLoading = false;
  customFieldService;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      customFieldsByType: observable,
      valuesByIssue: observable,
      isLoading: observable,
      fetchCustomFields: action,
      createCustomField: action,
      updateCustomField: action,
      deleteCustomField: action,
      reorderCustomFields: action,
      fetchIssueValues: action,
      saveIssueValues: action,
    });

    this.rootStore = _rootStore;
    this.customFieldService = new CustomFieldService();
  }

  getCustomFieldsByType = computedFn((typeId: string): ICustomField[] =>
    this.customFieldsByType[typeId] ?? []
  );

  getValuesByIssue = computedFn((issueId: string): ICustomFieldValue[] =>
    this.valuesByIssue[issueId] ?? []
  );

  fetchCustomFields = async (workspaceSlug: string, projectId: string, typeId: string) => {
    runInAction(() => { this.isLoading = true; });
    try {
      const response = await this.customFieldService.getCustomFields(workspaceSlug, projectId, typeId);
      runInAction(() => {
        set(this.customFieldsByType, typeId, response);
      });
      return response;
    } finally {
      runInAction(() => { this.isLoading = false; });
    }
  };

  createCustomField = async (workspaceSlug: string, projectId: string, typeId: string, data: ICustomFieldFormData) => {
    const response = await this.customFieldService.createCustomField(workspaceSlug, projectId, typeId, data);
    runInAction(() => {
      const existing = this.customFieldsByType[typeId] ?? [];
      set(this.customFieldsByType, typeId, [...existing, response]);
    });
    return response;
  };

  updateCustomField = async (
    workspaceSlug: string,
    projectId: string,
    typeId: string,
    fieldId: string,
    data: Partial<ICustomFieldFormData>
  ) => {
    const existing = this.customFieldsByType[typeId] ?? [];
    const original = existing.find((f) => f.id === fieldId);
    try {
      runInAction(() => {
        set(
          this.customFieldsByType,
          typeId,
          existing.map((f) => (f.id === fieldId ? { ...f, ...data } : f))
        );
      });
      const response = await this.customFieldService.updateCustomField(workspaceSlug, projectId, typeId, fieldId, data);
      runInAction(() => {
        set(
          this.customFieldsByType,
          typeId,
          (this.customFieldsByType[typeId] ?? []).map((f) => (f.id === fieldId ? response : f))
        );
      });
      return response;
    } catch (error) {
      if (original) {
        runInAction(() => {
          set(
            this.customFieldsByType,
            typeId,
            existing.map((f) => (f.id === fieldId ? original : f))
          );
        });
      }
      throw error;
    }
  };

  deleteCustomField = async (workspaceSlug: string, projectId: string, typeId: string, fieldId: string) => {
    await this.customFieldService.deleteCustomField(workspaceSlug, projectId, typeId, fieldId);
    runInAction(() => {
      set(
        this.customFieldsByType,
        typeId,
        (this.customFieldsByType[typeId] ?? []).filter((f) => f.id !== fieldId)
      );
    });
  };

  reorderCustomFields = async (workspaceSlug: string, projectId: string, typeId: string, orderedIds: string[]) => {
    await this.customFieldService.reorderCustomFields(workspaceSlug, projectId, typeId, orderedIds);
    runInAction(() => {
      const existing = this.customFieldsByType[typeId] ?? [];
      const reordered = orderedIds
        .map((id) => existing.find((f) => f.id === id))
        .filter(Boolean) as ICustomField[];
      set(this.customFieldsByType, typeId, reordered);
    });
  };

  fetchIssueValues = async (workspaceSlug: string, projectId: string, issueId: string) => {
    const response = await this.customFieldService.getIssueCustomFieldValues(workspaceSlug, projectId, issueId);
    runInAction(() => {
      set(this.valuesByIssue, issueId, response);
    });
    return response;
  };

  saveIssueValues = async (
    workspaceSlug: string,
    projectId: string,
    issueId: string,
    values: ICustomFieldValuePayload[]
  ) => {
    const response = await this.customFieldService.saveIssueCustomFieldValues(workspaceSlug, projectId, issueId, values);
    runInAction(() => {
      set(this.valuesByIssue, issueId, response);
    });
    return response;
  };
}
