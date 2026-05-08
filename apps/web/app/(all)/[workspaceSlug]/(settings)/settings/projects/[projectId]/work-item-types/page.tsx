/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { Layers, Pencil, Trash2 } from "lucide-react";
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import type { IWorkItemType, IWorkItemTypeFormData } from "@plane/types";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Button, Input, Loader } from "@plane/ui";
// components
import { NotAuthorizedView } from "@/components/auth-screens/not-authorized-view";
import { PageHead } from "@/components/core/page-title";
import { SettingsContentWrapper } from "@/components/settings/content-wrapper";
import { SettingsHeading } from "@/components/settings/heading";
// hooks
import { useProject } from "@/hooks/store/use-project";
import { useUserPermissions } from "@/hooks/store/user";
import { useWorkItemType } from "@/hooks/store/use-work-item-type";
// components - custom fields
import { CustomFieldsRoot } from "@/components/settings/project/work-item-types/custom-fields/root";
// local imports
import { WorkItemTypesProjectSettingsHeader } from "./header";

type PageParams = { workspaceSlug: string; projectId: string };

function WorkItemTypesSettingsPage({ params }: { params: PageParams }) {
  const { workspaceSlug, projectId } = params;
  const { t } = useTranslation();
  // store
  const { currentProjectDetails } = useProject();
  const { workspaceUserInfo, allowPermissions } = useUserPermissions();
  const { getProjectWorkItemTypes, fetchWorkItemTypes, createWorkItemType, updateWorkItemType, deleteWorkItemType } =
    useWorkItemType();
  // local state
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newTypeName, setNewTypeName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);

  // derived values
  const pageTitle = currentProjectDetails?.name ? `${currentProjectDetails.name} - Work Item Types` : undefined;
  const canManage = allowPermissions([EUserPermissions.ADMIN], EUserPermissionsLevel.PROJECT);
  const workItemTypes = getProjectWorkItemTypes(projectId) ?? [];

  useEffect(() => {
    fetchWorkItemTypes(workspaceSlug, projectId).finally(() => setIsLoading(false));
  }, [workspaceSlug, projectId, fetchWorkItemTypes]);

  if (workspaceUserInfo && !allowPermissions([EUserPermissions.ADMIN, EUserPermissions.MEMBER], EUserPermissionsLevel.PROJECT)) {
    return <NotAuthorizedView section="settings" isProjectView className="h-auto" />;
  }

  const handleCreate = async () => {
    if (!newTypeName.trim()) return;
    try {
      const payload: IWorkItemTypeFormData = { name: newTypeName.trim() };
      await createWorkItemType(workspaceSlug, projectId, payload);
      setNewTypeName("");
      setIsCreating(false);
      setToast({ type: TOAST_TYPE.SUCCESS, title: "Work item type created" });
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Failed to create work item type" });
    }
  };

  const handleUpdate = async (typeId: string) => {
    if (!editingName.trim()) return;
    try {
      await updateWorkItemType(workspaceSlug, projectId, typeId, { name: editingName.trim() });
      setEditingId(null);
      setToast({ type: TOAST_TYPE.SUCCESS, title: "Work item type updated" });
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Failed to update work item type" });
    }
  };

  const handleDelete = async (type: IWorkItemType) => {
    if (type.is_default) {
      setToast({ type: TOAST_TYPE.ERROR, title: "Default work item type cannot be deleted" });
      return;
    }
    try {
      await deleteWorkItemType(workspaceSlug, projectId, type.id);
      setToast({ type: TOAST_TYPE.SUCCESS, title: "Work item type deleted" });
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Failed to delete work item type" });
    }
  };

  return (
    <SettingsContentWrapper header={<WorkItemTypesProjectSettingsHeader />}>
      <PageHead title={pageTitle} />
      <div className="w-full">
        <SettingsHeading
          title={t("project_settings.work_item_types.heading", { defaultValue: "Work Item Types" })}
          description={t("project_settings.work_item_types.description", {
            defaultValue: "Manage the types of work items available in this project.",
          })}
        />
        <div className="mt-6 space-y-3">
          {isLoading ? (
            <Loader>
              <Loader.Item height="40px" />
              <Loader.Item height="40px" />
            </Loader>
          ) : (
            <>
              {workItemTypes.map((type) => (
                <div key={type.id} className="rounded-md border border-custom-border-200">
                  {/* Type header row */}
                  <div
                    className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-custom-background-90"
                    onClick={() => setSelectedTypeId((prev) => (prev === type.id ? null : type.id))}
                  >
                    <div className="flex items-center gap-3">
                      <Layers className="size-4 text-custom-text-300" />
                      {editingId === type.id ? (
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdate(type.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          className="h-7 w-48 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-sm font-medium text-custom-text-100">{type.name}</span>
                      )}
                      {type.is_default && (
                        <span className="rounded bg-custom-primary-100/10 px-2 py-0.5 text-xs text-custom-primary-100">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {canManage && (
                        <>
                          {editingId === type.id ? (
                            <>
                              <Button size="sm" onClick={() => handleUpdate(type.id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="neutral-primary" onClick={() => setEditingId(null)}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingId(type.id);
                                  setEditingName(type.name);
                                }}
                                className="text-custom-text-300 hover:text-custom-text-100"
                              >
                                <Pencil className="size-4" />
                              </button>
                              {!type.is_default && (
                                <button
                                  onClick={() => handleDelete(type)}
                                  className="text-custom-text-300 hover:text-red-500"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expandible custom fields section */}
                  {selectedTypeId === type.id && (
                    <div className="border-t border-custom-border-200 px-4 pb-4">
                      <CustomFieldsRoot
                        workspaceSlug={workspaceSlug}
                        projectId={projectId}
                        typeId={type.id}
                        canManage={canManage}
                      />
                    </div>
                  )}
                </div>
              ))}

              {canManage && (
                <div>
                  {isCreating ? (
                    <div className="flex items-center gap-3 rounded-md border border-custom-border-200 px-4 py-3">
                      <Layers className="size-4 text-custom-text-300" />
                      <Input
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreate();
                          if (e.key === "Escape") {
                            setIsCreating(false);
                            setNewTypeName("");
                          }
                        }}
                        placeholder="Type name..."
                        autoFocus
                        className="h-7 w-48 text-sm"
                      />
                      <Button size="sm" onClick={handleCreate}>
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="neutral-primary"
                        onClick={() => {
                          setIsCreating(false);
                          setNewTypeName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="neutral-primary" onClick={() => setIsCreating(true)}>
                      Add work item type
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </SettingsContentWrapper>
  );
}

export default observer(WorkItemTypesSettingsPage);
