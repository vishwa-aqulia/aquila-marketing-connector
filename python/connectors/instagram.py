"""
Instagram connector — extracts media, insights, and audience data
via the Instagram Graph API (requires a Facebook Page + IG Business Account).
"""

from datetime import datetime
from .base import BaseConnector

import requests


GRAPH_API_BASE = "https://graph.facebook.com/v19.0"


class InstagramConnector(BaseConnector):
    def __init__(self, settings):
        super().__init__("instagram", settings)
        self.cfg = settings.instagram

    def authenticate(self) -> bool:
        # Validate token and account ID
        url = f"{GRAPH_API_BASE}/{self.cfg.business_account_id}"
        params = {
            "fields": "id,username,followers_count,media_count",
            "access_token": self.cfg.access_token,
        }
        resp = requests.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        self.logger.info(
            f"Instagram auth successful — @{data.get('username')}, "
            f"{data.get('followers_count')} followers"
        )
        return True

    def extract(self, start_date: datetime, end_date: datetime) -> dict[str, list[dict]]:
        account_id = self.cfg.business_account_id
        token = self.cfg.access_token
        results = {}

        # --- Account insights (daily) ---
        results["instagram_account_insights"] = self._fetch_account_insights(
            account_id, token, start_date, end_date
        )

        # --- Media posts with insights ---
        results["instagram_media"] = self._fetch_media(account_id, token, start_date, end_date)

        total = sum(len(v) for v in results.values())
        self.logger.info(f"Instagram: extracted {total} rows")
        return results

    def _fetch_account_insights(
        self, account_id: str, token: str, start: datetime, end: datetime
    ) -> list[dict]:
        """Daily account-level metrics."""
        rows = []
        metrics = "impressions,reach,follower_count,profile_views,website_clicks"
        url = f"{GRAPH_API_BASE}/{account_id}/insights"
        params = {
            "metric": metrics,
            "period": "day",
            "since": int(start.timestamp()),
            "until": int(end.timestamp()),
            "access_token": token,
        }
        resp = requests.get(url, params=params)
        if resp.status_code != 200:
            self.logger.error(f"Account insights error: {resp.text}")
            return rows

        data = resp.json().get("data", [])
        # Pivot: each metric has its own time-series
        date_map: dict[str, dict] = {}
        for metric_data in data:
            metric_name = metric_data["name"]
            for val in metric_data.get("values", []):
                date_str = val["end_time"][:10]
                if date_str not in date_map:
                    date_map[date_str] = {"date": date_str}
                date_map[date_str][metric_name] = val["value"]

        rows = list(date_map.values())
        return rows

    def _fetch_media(
        self, account_id: str, token: str, start: datetime, end: datetime
    ) -> list[dict]:
        """Fetch recent media with per-post insights."""
        rows = []
        url = f"{GRAPH_API_BASE}/{account_id}/media"
        params = {
            "fields": "id,caption,media_type,timestamp,permalink,like_count,comments_count",
            "limit": 100,
            "access_token": token,
        }

        while url:
            resp = requests.get(url, params=params)
            if resp.status_code != 200:
                self.logger.error(f"Media fetch error: {resp.text}")
                break

            data = resp.json()
            for post in data.get("data", []):
                ts = post.get("timestamp", "")
                # Filter by date range
                if ts[:10] < start.strftime("%Y-%m-%d"):
                    return rows  # Posts are in reverse chronological order
                if ts[:10] > end.strftime("%Y-%m-%d"):
                    continue

                record = {
                    "post_id": post.get("id"),
                    "caption": (post.get("caption") or "")[:500],
                    "media_type": post.get("media_type"),
                    "timestamp": ts,
                    "permalink": post.get("permalink"),
                    "like_count": post.get("like_count", 0),
                    "comments_count": post.get("comments_count", 0),
                }

                # Fetch per-post insights
                insights = self._get_media_insights(post["id"], post.get("media_type"), token)
                record.update(insights)
                rows.append(record)

            # Pagination
            paging = data.get("paging", {})
            url = paging.get("next")
            params = {}  # URL already has params

        return rows

    def _get_media_insights(self, media_id: str, media_type: str, token: str) -> dict:
        """Get reach/impressions for a single post."""
        if media_type == "VIDEO":
            metrics = "impressions,reach,video_views,saved"
        else:
            metrics = "impressions,reach,saved"

        url = f"{GRAPH_API_BASE}/{media_id}/insights"
        params = {"metric": metrics, "access_token": token}
        resp = requests.get(url, params=params)
        result = {}
        if resp.status_code == 200:
            for m in resp.json().get("data", []):
                result[m["name"]] = m["values"][0]["value"]
        return result
