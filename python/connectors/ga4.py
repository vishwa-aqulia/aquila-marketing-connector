"""
Google Analytics 4 connector — extracts traffic, events, and conversion data.
"""

from datetime import datetime
from .base import BaseConnector

from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest,
    DateRange,
    Dimension,
    Metric,
)


class GA4Connector(BaseConnector):
    def __init__(self, settings):
        super().__init__("ga4", settings)
        self.cfg = settings.ga4

    def authenticate(self) -> bool:
        # Uses GOOGLE_APPLICATION_CREDENTIALS env var (service account JSON)
        self._client = BetaAnalyticsDataClient()
        self.logger.info("GA4 authentication successful")
        return True

    def extract(self, start_date: datetime, end_date: datetime) -> dict[str, list[dict]]:
        s = start_date.strftime("%Y-%m-%d")
        e = end_date.strftime("%Y-%m-%d")
        property_id = self.cfg.property_id
        results = {}

        # --- Daily traffic overview ---
        results["ga4_traffic"] = self._run_report(
            property_id, s, e,
            dimensions=["date", "sessionDefaultChannelGroup", "deviceCategory"],
            metrics=[
                "sessions", "totalUsers", "newUsers",
                "screenPageViews", "bounceRate",
                "averageSessionDuration", "engagedSessions",
            ],
        )

        # --- Page performance ---
        results["ga4_pages"] = self._run_report(
            property_id, s, e,
            dimensions=["date", "pagePath", "pageTitle"],
            metrics=[
                "screenPageViews", "totalUsers",
                "averageSessionDuration", "bounceRate",
            ],
        )

        # --- Events ---
        results["ga4_events"] = self._run_report(
            property_id, s, e,
            dimensions=["date", "eventName"],
            metrics=["eventCount", "totalUsers"],
        )

        # --- Conversions ---
        results["ga4_conversions"] = self._run_report(
            property_id, s, e,
            dimensions=["date", "sessionDefaultChannelGroup", "eventName"],
            metrics=["conversions", "totalRevenue"],
        )

        # --- Traffic sources ---
        results["ga4_sources"] = self._run_report(
            property_id, s, e,
            dimensions=["date", "sessionSource", "sessionMedium", "sessionCampaignName"],
            metrics=["sessions", "totalUsers", "conversions"],
        )

        total = sum(len(v) for v in results.values())
        self.logger.info(f"GA4: extracted {total} rows across {len(results)} tables")
        return results

    # ---- helpers ----

    def _run_report(
        self, property_id: str, start: str, end: str,
        dimensions: list[str], metrics: list[str],
    ) -> list[dict]:
        request = RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[DateRange(start_date=start, end_date=end)],
            dimensions=[Dimension(name=d) for d in dimensions],
            metrics=[Metric(name=m) for m in metrics],
            limit=100_000,
        )
        response = self._client.run_report(request)

        rows = []
        dim_headers = [h.name for h in response.dimension_headers]
        met_headers = [h.name for h in response.metric_headers]

        for row in response.rows:
            record = {}
            for i, dim in enumerate(row.dimension_values):
                record[dim_headers[i]] = dim.value
            for i, met in enumerate(row.metric_values):
                record[met_headers[i]] = self._cast_metric(met.value)
            rows.append(record)
        return rows

    @staticmethod
    def _cast_metric(value: str):
        """Try to convert metric strings to numbers."""
        try:
            if "." in value:
                return float(value)
            return int(value)
        except ValueError:
            return value
