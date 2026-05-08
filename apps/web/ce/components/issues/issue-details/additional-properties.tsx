/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
// components
import { CustomFieldsSection } from "@/components/issues/issue-detail/custom-fields-section";

export type TWorkItemAdditionalSidebarProperties = {
  workItemId: string;
  workItemTypeId: string | null;
  projectId: string;
  workspaceSlug: string;
  isEditable: boolean;
  isPeekView?: boolean;
};

export function WorkItemAdditionalSidebarProperties({
  workItemId,
  workItemTypeId,
  projectId,
  workspaceSlug,
  isEditable,
}: TWorkItemAdditionalSidebarProperties) {
  return (
    <CustomFieldsSection
      workspaceSlug={workspaceSlug}
      projectId={projectId}
      issueId={workItemId}
      typeId={workItemTypeId}
      isEditable={isEditable}
    />
  );
}
