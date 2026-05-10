/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { useParams } from "react-router";
import { Layers } from "lucide-react";
import { cn } from "@plane/utils";
import { CustomMenu } from "@plane/ui";
// hooks
import { useWorkItemType } from "@/hooks/store/use-work-item-type";

type Props = {
  projectId: string;
  value: string | null | undefined;
  onChange: (typeId: string) => void;
  disabled?: boolean;
};

export const IssueTypeSidebarSelect = observer(function IssueTypeSidebarSelect({
  projectId,
  value,
  onChange,
  disabled = false,
}: Props) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { getProjectWorkItemTypes, fetchedMap, fetchWorkItemTypes } = useWorkItemType();

  useEffect(() => {
    if (workspaceSlug && projectId && !fetchedMap[projectId]) {
      fetchWorkItemTypes(workspaceSlug, projectId);
    }
  }, [workspaceSlug, projectId, fetchedMap, fetchWorkItemTypes]);

  const workItemTypes = getProjectWorkItemTypes(projectId);

  if (!workItemTypes || workItemTypes.length === 0) return null;

  const selectedType = workItemTypes.find((t) => t.id === value) ?? workItemTypes.find((t) => t.is_default);

  return (
    <CustomMenu
      customButton={
        <button
          type="button"
          disabled={disabled}
          className="flex h-7.5 w-full items-center gap-1.5 rounded-sm px-2 py-0.5 text-left text-body-xs-regular hover:bg-custom-background-80 disabled:cursor-not-allowed"
        >
          <Layers className="size-3.5 shrink-0 text-custom-text-300" />
          <span className={cn("truncate", selectedType ? "text-custom-text-100" : "text-custom-text-400")}>
            {selectedType?.name ?? "No type"}
          </span>
        </button>
      }
      placement="bottom-start"
      disabled={disabled}
      closeOnSelect
    >
      {workItemTypes.map((type) => (
        <CustomMenu.MenuItem
          key={type.id}
          onClick={() => onChange(type.id)}
          className={cn("flex items-center gap-2", value === type.id && "font-medium")}
        >
          <Layers className="size-3.5 shrink-0" />
          <span className="truncate">{type.name}</span>
          {type.is_default && <span className="ml-auto text-xs text-custom-text-400">Default</span>}
        </CustomMenu.MenuItem>
      ))}
    </CustomMenu>
  );
});
