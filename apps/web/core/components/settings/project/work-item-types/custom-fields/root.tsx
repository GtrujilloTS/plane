/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useEffect, useState } from "react";
import { observer } from "mobx-react";
import { Plus } from "lucide-react";
import type { ICustomField, ICustomFieldFormData } from "@plane/types";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import { Button } from "@plane/ui";
// hooks
import { useCustomField } from "@/hooks/store/use-custom-field";
// components
import { CustomFieldItem } from "./field-item";
import { CreateUpdateCustomFieldModal } from "./create-update-field-modal";

type Props = {
  workspaceSlug: string;
  projectId: string;
  typeId: string;
  canManage: boolean;
};

export const CustomFieldsRoot = observer(function CustomFieldsRoot({
  workspaceSlug,
  projectId,
  typeId,
  canManage,
}: Props) {
  const { getCustomFieldsByType, fetchCustomFields, createCustomField, updateCustomField, deleteCustomField } =
    useCustomField();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<ICustomField | null>(null);

  useEffect(() => {
    if (typeId) fetchCustomFields(workspaceSlug, projectId, typeId);
  }, [typeId, workspaceSlug, projectId, fetchCustomFields]);

  const fields = getCustomFieldsByType(typeId);

  const handleSubmit = async (data: ICustomFieldFormData) => {
    try {
      if (editingField) {
        await updateCustomField(workspaceSlug, projectId, typeId, editingField.id, data);
        setToast({ type: TOAST_TYPE.SUCCESS, title: "Custom field updated" });
      } else {
        await createCustomField(workspaceSlug, projectId, typeId, data);
        setToast({ type: TOAST_TYPE.SUCCESS, title: "Custom field created" });
      }
      setEditingField(null);
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Failed to save custom field" });
      throw new Error("failed");
    }
  };

  const handleDelete = async (field: ICustomField) => {
    try {
      await deleteCustomField(workspaceSlug, projectId, typeId, field.id);
      setToast({ type: TOAST_TYPE.SUCCESS, title: "Custom field deleted" });
    } catch {
      setToast({ type: TOAST_TYPE.ERROR, title: "Failed to delete custom field" });
    }
  };

  const openCreate = () => {
    setEditingField(null);
    setIsModalOpen(true);
  };

  const openEdit = (field: ICustomField) => {
    setEditingField(field);
    setIsModalOpen(true);
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-custom-text-200">Custom Fields</h4>
        {canManage && (
          <Button size="sm" variant="neutral-primary" onClick={openCreate}>
            <Plus className="size-3.5 mr-1" />
            Add field
          </Button>
        )}
      </div>

      {fields.length === 0 ? (
        <p className="py-3 text-center text-xs text-custom-text-400">
          No custom fields defined for this type.
        </p>
      ) : (
        <div className="space-y-2">
          {fields.map((field) => (
            <CustomFieldItem
              key={field.id}
              field={field}
              canManage={canManage}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreateUpdateCustomFieldModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingField(null); }}
        onSubmit={handleSubmit}
        field={editingField}
      />
    </div>
  );
});
