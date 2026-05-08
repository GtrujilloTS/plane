/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useContext } from "react";
import { StoreContext } from "@/lib/store-context";
import type { ICustomFieldStore } from "@/store/custom-field.store";

export const useCustomField = (): ICustomFieldStore => {
  const context = useContext(StoreContext);
  if (context === undefined) throw new Error("useCustomField must be used within StoreProvider");
  return context.customField;
};
