/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

export type IWorkItemType = {
  id: string;
  name: string;
  description: string;
  logo_props: Record<string, unknown>;
  is_default: boolean;
  is_active: boolean;
  is_epic: boolean;
  created_at: string;
};

export type IWorkItemTypeFormData = {
  name: string;
  description?: string;
  logo_props?: Record<string, unknown>;
  is_default?: boolean;
  is_active?: boolean;
};
