"""
Facebook Ads connector — extracts campaign, ad set, and ad performance.
"""

from datetime import datetime
from .base import BaseConnector

from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad


class FacebookAdsConnector(BaseConnector):
    def __init__(self, settings):
        super().__init__("facebook", settings)
        self.cfg = settings.facebook

    def authenticate(self) -> bool:
        FacebookAdsApi.init(
            self.cfg.app_id,
            self.cfg.app_secret,
            self.cfg.access_token,
        )
        account_id = self.cfg.ad_account_id
        if not account_id.startswith("act_"):
            account_id = f"act_{account_id}"
        self._account = AdAccount(account_id)
        # Quick validation — fetch account name
        self._account.api_get(fields=["name"])
        self.logger.info("Facebook Ads authentication successful")
        return True

    def extract(self, start_date: datetime, end_date: datetime) -> dict[str, list[dict]]:
        s = start_date.strftime("%Y-%m-%d")
        e = end_date.strftime("%Y-%m-%d")
        time_range = {"since": s, "until": e}

        results = {}

        # --- Campaign-level insights ---
        results["facebook_campaigns"] = self._get_insights(
            level="campaign",
            time_range=time_range,
            fields=[
                "campaign_id", "campaign_name",
                "impressions", "clicks", "spend",
                "cpc", "cpm", "ctr",
                "actions", "action_values",
                "reach", "frequency",
            ],
        )

        # --- Ad set-level insights ---
        results["facebook_ad_sets"] = self._get_insights(
            level="adset",
            time_range=time_range,
            fields=[
                "campaign_id", "campaign_name",
                "adset_id", "adset_name",
                "impressions", "clicks", "spend",
                "cpc", "cpm", "ctr",
                "actions", "reach",
            ],
        )

        # --- Ad-level insights ---
        results["facebook_ads"] = self._get_insights(
            level="ad",
            time_range=time_range,
            fields=[
                "campaign_id", "campaign_name",
                "adset_id", "adset_name",
                "ad_id", "ad_name",
                "impressions", "clicks", "spend",
                "cpc", "cpm", "ctr",
                "actions",
            ],
        )

        total = sum(len(v) for v in results.values())
        self.logger.info(f"Facebook Ads: extracted {total} rows across {len(results)} tables")
        return results

    def _get_insights(self, level: str, time_range: dict, fields: list[str]) -> list[dict]:
        rows = []
        params = {
            "level": level,
            "time_range": time_range,
            "time_increment": 1,  # daily breakdown
        }
        insights = self._account.get_insights(fields=fields, params=params)
        for insight in insights:
            record = {"date": insight.get("date_start", "")}
            for f in fields:
                val = insight.get(f)
                if f == "actions" and val:
                    # Flatten actions into separate columns
                    for action in val:
                        action_type = action["action_type"]
                        record[f"action_{action_type}"] = float(action["value"])
                elif f == "action_values" and val:
                    for av in val:
                        record[f"value_{av['action_type']}"] = float(av["value"])
                else:
                    record[f] = self._cast(val)
            rows.append(record)
        return rows

    @staticmethod
    def _cast(val):
        if val is None:
            return None
        if isinstance(val, str):
            try:
                return float(val) if "." in val else int(val)
            except ValueError:
                return val
        return val
