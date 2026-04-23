"""
Google Business Profile connector — extracts reviews, insights, and posts.
Uses the Business Profile Performance API and My Business API.
"""

from datetime import datetime
from .base import BaseConnector

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


class GoogleBusinessConnector(BaseConnector):
    def __init__(self, settings):
        super().__init__("google_business", settings)
        self.cfg = settings.google_business

    def authenticate(self) -> bool:
        creds = Credentials(
            token=None,
            refresh_token=self.cfg.refresh_token,
            client_id=self.cfg.client_id,
            client_secret=self.cfg.client_secret,
            token_uri="https://oauth2.googleapis.com/token",
        )
        self._mybiz = build("mybusinessbusinessinformation", "v1", credentials=creds)
        self._perf = build("businessprofileperformance", "v1", credentials=creds)
        self._reviews_service = build("mybusinessreviews", "v1", credentials=creds) if True else None
        self.logger.info("Google Business Profile authentication successful")
        return True

    def extract(self, start_date: datetime, end_date: datetime) -> dict[str, list[dict]]:
        account = self.cfg.account_id
        location = self.cfg.location_id
        location_name = f"locations/{location}"

        results = {}

        # --- Performance metrics (daily) ---
        results["gbp_performance"] = self._fetch_performance(
            location_name, start_date, end_date
        )

        # --- Reviews ---
        results["gbp_reviews"] = self._fetch_reviews(account, location)

        total = sum(len(v) for v in results.values())
        self.logger.info(f"Google Business Profile: extracted {total} rows")
        return results

    def _fetch_performance(
        self, location_name: str, start: datetime, end: datetime
    ) -> list[dict]:
        """Fetch daily performance metrics via Business Profile Performance API."""
        rows = []
        try:
            s = start.strftime("%Y-%m-%d")
            e = end.strftime("%Y-%m-%d")

            response = (
                self._perf.locations()
                .fetchMultiDailyMetricsTimeSeries(
                    location=location_name,
                    dailyMetrics=[
                        "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
                        "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
                        "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
                        "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
                        "CALL_CLICKS",
                        "WEBSITE_CLICKS",
                        "BUSINESS_DIRECTION_REQUESTS",
                    ],
                    dailyRange_startDate_year=start.year,
                    dailyRange_startDate_month=start.month,
                    dailyRange_startDate_day=start.day,
                    dailyRange_endDate_year=end.year,
                    dailyRange_endDate_month=end.month,
                    dailyRange_endDate_day=end.day,
                )
                .execute()
            )

            for series in response.get("multiDailyMetricTimeSeries", []):
                metric_name = series.get("dailyMetric", "")
                for ts in series.get("dailyMetricTimeSeries", {}).get(
                    "timeSeries", {}).get("datedValues", []
                ):
                    date_obj = ts.get("date", {})
                    date_str = f"{date_obj.get('year')}-{date_obj.get('month', 1):02d}-{date_obj.get('day', 1):02d}"
                    rows.append({
                        "date": date_str,
                        "metric": metric_name,
                        "value": int(ts.get("value", 0)),
                        "location": location_name,
                    })
        except Exception as ex:
            self.logger.error(f"Performance fetch error: {ex}")
        return rows

    def _fetch_reviews(self, account_id: str, location_id: str) -> list[dict]:
        """Fetch all reviews for a location."""
        rows = []
        try:
            parent = f"accounts/{account_id}/locations/{location_id}"
            request = self._reviews_service.accounts().locations().reviews().list(
                parent=parent, pageSize=50
            )
            while request is not None:
                response = request.execute()
                for review in response.get("reviews", []):
                    reviewer = review.get("reviewer", {})
                    rating = review.get("starRating", "")
                    rows.append({
                        "review_id": review.get("reviewId", ""),
                        "reviewer_name": reviewer.get("displayName", ""),
                        "star_rating": rating,
                        "comment": review.get("comment", ""),
                        "create_time": review.get("createTime", ""),
                        "update_time": review.get("updateTime", ""),
                        "reply_comment": review.get("reviewReply", {}).get("comment", ""),
                        "reply_time": review.get("reviewReply", {}).get("updateTime", ""),
                    })
                request = (
                    self._reviews_service.accounts().locations().reviews()
                    .list_next(request, response)
                )
        except Exception as ex:
            self.logger.error(f"Reviews fetch error: {ex}")
        return rows
