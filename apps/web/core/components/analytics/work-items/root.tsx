/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import AnalyticsWrapper from "../analytics-wrapper";
import TotalInsights from "../total-insights";
import CompletedByWeek from "./completed-by-week";
import CreatedVsResolved from "./created-vs-resolved";
import CustomizedInsights from "./customized-insights";
import IssuesByMember from "./issues-by-member";
import ResolutionByPriority from "./resolution-by-priority";
import WorkItemsInsightTable from "./workitems-insight-table";

function WorkItems() {
  return (
    <AnalyticsWrapper i18nTitle="sidebar.work_items">
      <div className="flex flex-col gap-14">
        <TotalInsights analyticsType="work-items" />
        <CreatedVsResolved />
        <CompletedByWeek />
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2">
          <IssuesByMember />
          <ResolutionByPriority />
        </div>
        <CustomizedInsights />
        <WorkItemsInsightTable />
      </div>
    </AnalyticsWrapper>
  );
}

export { WorkItems };
