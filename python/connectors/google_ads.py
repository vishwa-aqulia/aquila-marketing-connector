"""
Google Ads connector — extracts campaign, ad group, ad, and keyword performance.
"""

from datetime import datetime
from .base import BaseConnector

from google.ads.googleads.client import GoogleAdsClient
from google.ads.googleads.errors import GoogleAdsException


class GoogleAdsConnector(BaseConnector):
    def __init__(self, settings):
        super().__init__("google_ads", settings)
        self.cfg = settings.google_ads

    def authenticate(self) -> bool:
        credentials = {
            "developer_token": self.cfg.developer_token,
            "client_id": self.cfg.client_id,
            "client_secret": self.cfg.client_secret,
            "refresh_token": self.cfg.refresh_token,
            "use_proto_plus": True,
        }
        if self.cfg.login_customer_id:
            credentials["login_customer_id"] = self.cfg.login_customer_id

        self._client = GoogleAdsClient.load_from_dict(credentials)
        # Quick validation — list accessible customers
        customer_service = self._client.get_service("CustomerService")
        customer_service.list_accessible_customers()
        self.logger.info("Google Ads authentication successful")
        return True

    def extract(self, start_date: datetime, end_date: datetime) -> dict[str, list[dict]]:
        ga_service = self._client.get_service("GoogleAdsService")
        customer_id = self.cfg.customer_id.replace("-", "")
        s = start_date.strftime("%Y-%m-%d")
        e = end_date.strftime("%Y-%m-%d")

        results = {}

        # --- Campaign performance ---
        results["google_ads_campaigns"] = self._query(
            ga_service, customer_id,
            f"""
            SELECT
                campaign.id,
                campaign.name,
                campaign.status,
                campaign.advertising_channel_type,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.conversions_value,
                metrics.ctr,
                metrics.average_cpc,
                segments.date
            FROM campaign
            WHERE segments.date BETWEEN '{s}' AND '{e}'
            ORDER BY segments.date DESC
            """,
            self._parse_campaign_row,
        )

        # --- Ad group performance ---
        results["google_ads_ad_groups"] = self._query(
            ga_service, customer_id,
            f"""
            SELECT
                ad_group.id,
                ad_group.name,
                ad_group.status,
                campaign.id,
                campaign.name,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.ctr,
                metrics.average_cpc,
                segments.date
            FROM ad_group
            WHERE segments.date BETWEEN '{s}' AND '{e}'
            ORDER BY segments.date DESC
            """,
            self._parse_ad_group_row,
        )

        # --- Keyword performance ---
        results["google_ads_keywords"] = self._query(
            ga_service, customer_id,
            f"""
            SELECT
                ad_group_criterion.keyword.text,
                ad_group_criterion.keyword.match_type,
                ad_group_criterion.quality_info.quality_score,
                campaign.name,
                ad_group.name,
                metrics.impressions,
                metrics.clicks,
                metrics.cost_micros,
                metrics.conversions,
                metrics.ctr,
                metrics.average_cpc,
                segments.date
            FROM keyword_view
            WHERE segments.date BETWEEN '{s}' AND '{e}'
            ORDER BY segments.date DESC
            """,
            self._parse_keyword_row,
        )

        total = sum(len(v) for v in results.values())
        self.logger.info(f"Google Ads: extracted {total} rows across {len(results)} tables")
        return results

    # ---- helpers ----

    def _query(self, service, customer_id, query, parser):
        rows = []
        try:
            response = service.search(customer_id=customer_id, query=query)
            for row in response:
                rows.append(parser(row))
        except GoogleAdsException as ex:
            self.logger.error(f"Google Ads query error: {ex.failure}")
        return rows

    @staticmethod
    def _parse_campaign_row(row) -> dict:
        return {
            "date": str(row.segments.date),
            "campaign_id": str(row.campaign.id),
            "campaign_name": row.campaign.name,
            "status": row.campaign.status.name,
            "channel_type": row.campaign.advertising_channel_type.name,
            "impressions": row.metrics.impressions,
            "clicks": row.metrics.clicks,
            "cost": row.metrics.cost_micros / 1_000_000,
            "conversions": row.metrics.conversions,
            "conversion_value": row.metrics.conversions_value,
            "ctr": row.metrics.ctr,
            "avg_cpc": row.metrics.average_cpc / 1_000_000,
        }

    @staticmethod
    def _parse_ad_group_row(row) -> dict:
        return {
            "date": str(row.segments.date),
            "ad_group_id": str(row.ad_group.id),
            "ad_group_name": row.ad_group.name,
            "ad_group_status": row.ad_group.status.name,
            "campaign_id": str(row.campaign.id),
            "campaign_name": row.campaign.name,
            "impressions": row.metrics.impressions,
            "clicks": row.metrics.clicks,
            "cost": row.metrics.cost_micros / 1_000_000,
            "conversions": row.metrics.conversions,
            "ctr": row.metrics.ctr,
            "avg_cpc": row.metrics.average_cpc / 1_000_000,
        }

    @staticmethod
    def _parse_keyword_row(row) -> dict:
        return {
            "date": str(row.segments.date),
            "keyword": row.ad_group_criterion.keyword.text,
            "match_type": row.ad_group_criterion.keyword.match_type.name,
            "quality_score": row.ad_group_criterion.quality_info.quality_score,
            "campaign_name": row.campaign.name,
            "ad_group_name": row.ad_group.name,
            "impressions": row.metrics.impressions,
            "clicks": row.metrics.clicks,
            "cost": row.metrics.cost_micros / 1_000_000,
            "conversions": row.metrics.conversions,
            "ctr": row.metrics.ctr,
            "avg_cpc": row.metrics.average_cpc / 1_000_000,
        }
