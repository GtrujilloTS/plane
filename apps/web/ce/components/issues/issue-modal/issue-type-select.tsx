/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect } from "react";
import { observer } from "mobx-react";
import { useController } from "react-hook-form";
import type { Control } from "react-hook-form";
import { ChevronDown, Layers } from "lucide-react";
// plane imports
import type { EditorRefApi } from "@plane/editor";
// types
import type { TBulkIssueProperties, TIssue } from "@plane/types";
import { cn } from "@plane/utils";
import { CustomMenu } from "@plane/ui";
// hooks
import { useParams } from "react-router";
import { useWorkItemType } from "@/hooks/store/use-work-item-type";

export type TIssueFields = TIssue & TBulkIssueProperties;

export type TIssueTypeDropdownVariant = "xs" | "sm";

export type TIssueTypeSelectProps<T extends Partial<TIssueFields>> = {
  control: Control<T>;
  projectId: string | null;
  editorRef?: React.MutableRefObject<EditorRefApi | null>;
  disabled?: boolean;
  variant?: TIssueTypeDropdownVariant;
  placeholder?: string;
  isRequired?: boolean;
  renderChevron?: boolean;
  dropDownContainerClassName?: string;
  showMandatoryFieldInfo?: boolean;
  handleFormChange?: () => void;
};

export const IssueTypeSelect = observer(function IssueTypeSelect<T extends Partial<TIssueFields>>(
  props: TIssueTypeSelectProps<T>
) {
  const {
    control,
    projectId,
    disabled = false,
    variant = "sm",
    placeholder = "Type",
    renderChevron = false,
    dropDownContainerClassName,
    handleFormChange,
  } = props;

  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { getProjectWorkItemTypes, fetchedMap, fetchWorkItemTypes } = useWorkItemType();

  const {
    field: { value, onChange },
  } = useController({ control: control as Control<TIssueFields>, name: "type_id" });

  const workItemTypes = projectId ? getProjectWorkItemTypes(projectId) : null;

  // Fetch types when projectId is available and not yet fetched
  useEffect(() => {
    if (projectId && workspaceSlug && !fetchedMap[projectId]) {
      fetchWorkItemTypes(workspaceSlug, projectId);
    }
  }, [projectId, workspaceSlug, fetchedMap, fetchWorkItemTypes]);

  // Auto-set default type when types are loaded and no type is selected yet
  useEffect(() => {
    if (!value && workItemTypes && workItemTypes.length > 0) {
      const defaultType = workItemTypes.find((t) => t.is_default) ?? workItemTypes[0];
      if (defaultType) {
        onChange(defaultType.id);
        handleFormChange?.();
      }
    }
  }, [workItemTypes, value, onChange, handleFormChange]);

  if (!projectId || !workItemTypes || workItemTypes.length === 0) return null;

  const selectedType = workItemTypes.find((t) => t.id === value) ?? workItemTypes.find((t) => t.is_default);
  const displayName = selectedType?.name ?? placeholder;

  return (
    <CustomMenu
      buttonClassName={dropDownContainerClassName}
      customButton={
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center gap-1 rounded border border-custom-border-300 px-2 text-custom-text-300 hover:bg-custom-background-80",
            variant === "xs" ? "h-6 text-xs" : "h-7 text-sm"
          )}
        >
          <Layers className={cn("shrink-0", variant === "xs" ? "size-3" : "size-3.5")} />
          <span className="max-w-24 truncate">{displayName}</span>
          {renderChevron && <ChevronDown className="size-3 shrink-0" />}
        </button>
      }
      placement="bottom-start"
      disabled={disabled}
      closeOnSelect
    >
      {workItemTypes.map((type) => (
        <CustomMenu.MenuItem
          key={type.id}
          onClick={() => {
            onChange(type.id);
            handleFormChange?.();
          }}
          className={cn("flex items-center gap-2", value === type.id && "font-medium")}
        >
          <Layers className="size-3.5 shrink-0" />
          <span className="truncate">{type.name}</span>
          {type.is_default && (
            <span className="ml-auto text-xs text-custom-text-400">Default</span>
          )}
        </CustomMenu.MenuItem>
      ))}
    </CustomMenu>
  );
});
