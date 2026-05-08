/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { useMemo } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import useSWR from "swr";
// plane package imports
import { useTranslation } from "@plane/i18n";
import { LineChart } from "@plane/propel/charts/line-chart";
import { EmptyStateCompact } from "@plane/propel/empty-state";
import type { IChartResponse } from "@plane/types";
// hooks
import { useAnalytics } from "@/hooks/store/use-analytics";
// services
import { AnalyticsService } from "@/services/analytics.service";
// plane web components
import AnalyticsSectionWrapper from "../analytics-section-wrapper";
import { ChartLoader } from "../loaders";

const analyticsService = new AnalyticsService();

function getMonday(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().split("T")[0]!;
}

function formatWeekLabel(isoDate: string): string {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const CompletedByWeek = observer(function CompletedByWeek() {
  const { selectedDuration, selectedProjects, selectedCycle, selectedModule, isPeekView, isEpic } = useAnalytics();
  const params = useParams();
  const { t } = useTranslation();
  const workspaceSlug = params.workspaceSlug.toString();

  const { data: chartData, isLoading } = useSWR(
    `completed-by-week-${workspaceSlug}-${selectedDuration}-${selectedProjects}-${selectedCycle}-${selectedModule}-${isPeekView}-${isEpic}`,
    () =>
      analyticsService.getAdvanceAnalyticsCharts<IChartResponse>(
        workspaceSlug,
        "work-items",
        {
          ...(selectedProjects?.length > 0 && { project_ids: selectedProjects?.join(",") }),
          ...(selectedCycle ? { cycle_id: selectedCycle } : {}),
          ...(selectedModule ? { module_id: selectedModule } : {}),
          ...(isEpic ? { epic: true } : {}),
        },
        isPeekView
      )
  );

  const weeklyData = useMemo(() => {
    if (!chartData?.data) return [];
    const weekMap = new Map<string, number>();
    const weekOrder: string[] = [];

    chartData.data.forEach((datum) => {
      if (!datum.key) return;
      const monday = getMonday(datum.key as string);
      if (!weekMap.has(monday)) {
        weekMap.set(monday, 0);
        weekOrder.push(monday);
      }
      weekMap.set(monday, (weekMap.get(monday) ?? 0) + ((datum.completed_issues as number) ?? 0));
    });

    return weekOrder.map((monday) => ({
      name: formatWeekLabel(monday),
      completed_issues: weekMap.get(monday) ?? 0,
    }));
  }, [chartData]);

  const lines = useMemo(
    () => [
      {
        key: "completed_issues" as const,
        label: t("workspace_analytics.resolved"),
        dashedLine: false,
        fill: "#19803833",
        showDot: true,
        smoothCurves: true,
        stroke: "#198038",
      },
    ],
    [t]
  );

  return (
    <AnalyticsSectionWrapper
      title={t("workspace_analytics.completed_by_week") || "Completados por semana"}
      className="col-span-1"
    >
      {isLoading ? (
        <ChartLoader />
      ) : weeklyData.length > 0 ? (
        <LineChart
          className="h-[350px] w-full"
          data={weeklyData}
          lines={lines}
          xAxis={{
            key: "name",
            label: t("week") || "Semana",
          }}
          yAxis={{
            key: "completed_issues",
            label: t("common.no_of", { entity: isEpic ? t("epics") : t("work_items") }),
            offset: -60,
            dx: -24,
          }}
          legend={{
            align: "left",
            verticalAlign: "bottom",
            layout: "horizontal",
            wrapperStyles: {
              justifyContent: "start",
              paddingLeft: "40px",
              paddingTop: "10px",
            },
          }}
        />
      ) : (
        <EmptyStateCompact
          assetKey="unknown"
          assetClassName="size-20"
          rootClassName="border border-subtle px-5 py-10 md:py-20 md:px-20"
          title={t("workspace_empty_state.analytics_work_items.title")}
        />
      )}
    </AnalyticsSectionWrapper>
  );
});

export default CompletedByWeek;
