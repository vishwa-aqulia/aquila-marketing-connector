"""
YouTube connector — extracts channel stats, video metadata, and analytics.
Uses YouTube Data API v3 and YouTube Analytics API.
"""

from datetime import datetime
from .base import BaseConnector

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


class YouTubeConnector(BaseConnector):
    def __init__(self, settings):
        super().__init__("youtube", settings)
        self.cfg = settings.youtube

    def authenticate(self) -> bool:
        creds = Credentials(
            token=None,
            refresh_token=self.cfg.refresh_token,
            client_id=self.cfg.client_id,
            client_secret=self.cfg.client_secret,
            token_uri="https://oauth2.googleapis.com/token",
        )
        self._data_client = build("youtube", "v3", credentials=creds)
        self._analytics_client = build("youtubeAnalytics", "v2", credentials=creds)
        self.logger.info("YouTube authentication successful")
        return True

    def extract(self, start_date: datetime, end_date: datetime) -> dict[str, list[dict]]:
        results = {}

        # --- Channel statistics ---
        results["youtube_channel"] = self._fetch_channel_stats()

        # --- Video list with stats ---
        results["youtube_videos"] = self._fetch_videos()

        # --- Daily channel analytics ---
        results["youtube_daily_analytics"] = self._fetch_daily_analytics(start_date, end_date)

        # --- Traffic source analytics ---
        results["youtube_traffic_sources"] = self._fetch_traffic_sources(start_date, end_date)

        total = sum(len(v) for v in results.values())
        self.logger.info(f"YouTube: extracted {total} rows")
        return results

    def _fetch_channel_stats(self) -> list[dict]:
        """Get current channel-level statistics."""
        request = self._data_client.channels().list(
            part="snippet,statistics,contentDetails",
            id=self.cfg.channel_id,
        )
        response = request.execute()
        rows = []
        for ch in response.get("items", []):
            stats = ch.get("statistics", {})
            snippet = ch.get("snippet", {})
            rows.append({
                "channel_id": ch["id"],
                "channel_title": snippet.get("title", ""),
                "subscriber_count": int(stats.get("subscriberCount", 0)),
                "view_count": int(stats.get("viewCount", 0)),
                "video_count": int(stats.get("videoCount", 0)),
                "snapshot_date": datetime.utcnow().strftime("%Y-%m-%d"),
            })
        return rows

    def _fetch_videos(self) -> list[dict]:
        """Fetch recent videos from the channel's uploads playlist."""
        # First, get the uploads playlist ID
        ch_resp = self._data_client.channels().list(
            part="contentDetails",
            id=self.cfg.channel_id,
        ).execute()

        uploads_playlist = (
            ch_resp["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]
        )

        # Fetch playlist items
        video_ids = []
        request = self._data_client.playlistItems().list(
            part="contentDetails",
            playlistId=uploads_playlist,
            maxResults=50,
        )
        response = request.execute()
        for item in response.get("items", []):
            video_ids.append(item["contentDetails"]["videoId"])

        if not video_ids:
            return []

        # Fetch video details + stats in batches of 50
        rows = []
        for i in range(0, len(video_ids), 50):
            batch = video_ids[i : i + 50]
            vids_resp = self._data_client.videos().list(
                part="snippet,statistics,contentDetails",
                id=",".join(batch),
            ).execute()

            for vid in vids_resp.get("items", []):
                snippet = vid["snippet"]
                stats = vid.get("statistics", {})
                rows.append({
                    "video_id": vid["id"],
                    "title": snippet.get("title", ""),
                    "published_at": snippet.get("publishedAt", ""),
                    "description": (snippet.get("description") or "")[:500],
                    "duration": vid.get("contentDetails", {}).get("duration", ""),
                    "view_count": int(stats.get("viewCount", 0)),
                    "like_count": int(stats.get("likeCount", 0)),
                    "comment_count": int(stats.get("commentCount", 0)),
                    "favorite_count": int(stats.get("favoriteCount", 0)),
                    "snapshot_date": datetime.utcnow().strftime("%Y-%m-%d"),
                })
        return rows

    def _fetch_daily_analytics(self, start: datetime, end: datetime) -> list[dict]:
        """Daily channel-level analytics from YouTube Analytics API."""
        response = self._analytics_client.reports().query(
            ids="channel==MINE",
            startDate=start.strftime("%Y-%m-%d"),
            endDate=end.strftime("%Y-%m-%d"),
            metrics="views,estimatedMinutesWatched,averageViewDuration,likes,dislikes,shares,subscribersGained,subscribersLost",
            dimensions="day",
            sort="day",
        ).execute()

        headers = [col["name"] for col in response.get("columnHeaders", [])]
        rows = []
        for row_data in response.get("rows", []):
            record = dict(zip(headers, row_data))
            record["date"] = record.pop("day", "")
            rows.append(record)
        return rows

    def _fetch_traffic_sources(self, start: datetime, end: datetime) -> list[dict]:
        """Traffic source breakdown from YouTube Analytics API."""
        response = self._analytics_client.reports().query(
            ids="channel==MINE",
            startDate=start.strftime("%Y-%m-%d"),
            endDate=end.strftime("%Y-%m-%d"),
            metrics="views,estimatedMinutesWatched",
            dimensions="insightTrafficSourceType",
            sort="-views",
        ).execute()

        headers = [col["name"] for col in response.get("columnHeaders", [])]
        rows = []
        for row_data in response.get("rows", []):
            record = dict(zip(headers, row_data))
            record["period_start"] = start.strftime("%Y-%m-%d")
            record["period_end"] = end.strftime("%Y-%m-%d")
            rows.append(record)
        return rows
