/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// CUSTOM: implement custom field property values for issue modal [GTS-006]

import React, { useRef, useState } from "react";
import { observer } from "mobx-react";
// plane imports
import type { ICustomFieldValuePayload, ISearchIssueResponse, TIssue } from "@plane/types";
// components
import { IssueModalContext } from "@/components/issues/issue-modal/context";
// hooks
import { useUser } from "@/hooks/store/user/user-user";
import { useWorkItemType } from "@/hooks/store/use-work-item-type";
import { useCustomField } from "@/hooks/store/use-custom-field";

export type TIssueModalProviderProps = {
  templateId?: string;
  dataForPreload?: Partial<TIssue>;
  allowedProjectIds?: string[];
  children: React.ReactNode;
};

export const IssueModalProvider = observer(function IssueModalProvider(props: TIssueModalProviderProps) {
  const { children, allowedProjectIds } = props;
  // states
  const [selectedParentIssue, setSelectedParentIssue] = useState<ISearchIssueResponse | null>(null);
  const [issuePropertyValues, _setIssuePropertyValues] = useState<Record<string, ICustomFieldValuePayload>>({});

  // Ref always holds the latest value — avoids stale closure in handleCreateUpdatePropertyValues
  const issuePropertyValuesRef = useRef<Record<string, ICustomFieldValuePayload>>({});

  const setIssuePropertyValues = (
    updater:
      | Record<string, ICustomFieldValuePayload>
      | ((prev: Record<string, ICustomFieldValuePayload>) => Record<string, ICustomFieldValuePayload>)
  ) => {
    _setIssuePropertyValues((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      issuePropertyValuesRef.current = next;
      return next;
    });
  };

  // store hooks
  const { projectsWithCreatePermissions } = useUser();
  const { getProjectWorkItemTypes } = useWorkItemType();
  const { saveIssueValues } = useCustomField();
  // derived values
  const projectIdsWithCreatePermissions = Object.keys(projectsWithCreatePermissions ?? {});

  const handleCreateUpdatePropertyValues = async ({
    issueId,
    projectId,
    workspaceSlug,
  }: {
    issueId: string;
    issueTypeId: string | null | undefined;
    projectId: string;
    workspaceSlug: string;
    isDraft?: boolean;
  }) => {
    // Always read from ref to avoid stale closure issues
    const payloads = Object.values(issuePropertyValuesRef.current);
    if (payloads.length === 0) return;

    try {
      await saveIssueValues(workspaceSlug, projectId, issueId, payloads);
    } catch (err) {
      console.error("[CustomFields] Failed to save custom field values:", err);
    }

    // Reset after save
    issuePropertyValuesRef.current = {};
    _setIssuePropertyValues({});
  };

  return (
    <IssueModalContext.Provider
      value={{
        allowedProjectIds: allowedProjectIds ?? projectIdsWithCreatePermissions,
        workItemTemplateId: null,
        setWorkItemTemplateId: () => {},
        isApplyingTemplate: false,
        setIsApplyingTemplate: () => {},
        selectedParentIssue,
        setSelectedParentIssue,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        issuePropertyValues: issuePropertyValues as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setIssuePropertyValues: setIssuePropertyValues as any,
        issuePropertyValueErrors: {},
        setIssuePropertyValueErrors: () => {},
        getIssueTypeIdOnProjectChange: (projectId: string) => {
          const types = getProjectWorkItemTypes(projectId);
          return types?.find((t) => t.is_default)?.id ?? types?.[0]?.id ?? null;
        },
        getActiveAdditionalPropertiesLength: () => 0,
        handlePropertyValuesValidation: () => true,
        handleCreateUpdatePropertyValues,
        handleProjectEntitiesFetch: () => Promise.resolve(),
        handleTemplateChange: () => Promise.resolve(),
        handleConvert: () => Promise.resolve(),
        handleCreateSubWorkItem: () => Promise.resolve(),
      }}
    >
      {children}
    </IssueModalContext.Provider>
  );
});
