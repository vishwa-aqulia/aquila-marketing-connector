"""
Central configuration loaded from environment variables / .env file.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def _get(key: str, default: str = "") -> str:
    return os.getenv(key, default)


@dataclass
class GoogleAdsConfig:
    developer_token: str = field(default_factory=lambda: _get("GOOGLE_ADS_DEVELOPER_TOKEN"))
    client_id: str = field(default_factory=lambda: _get("GOOGLE_ADS_CLIENT_ID"))
    client_secret: str = field(default_factory=lambda: _get("GOOGLE_ADS_CLIENT_SECRET"))
    refresh_token: str = field(default_factory=lambda: _get("GOOGLE_ADS_REFRESH_TOKEN"))
    customer_id: str = field(default_factory=lambda: _get("GOOGLE_ADS_CUSTOMER_ID"))
    login_customer_id: str = field(default_factory=lambda: _get("GOOGLE_ADS_LOGIN_CUSTOMER_ID"))


@dataclass
class GA4Config:
    property_id: str = field(default_factory=lambda: _get("GA4_PROPERTY_ID"))
    credentials_json: str = field(default_factory=lambda: _get("GOOGLE_APPLICATION_CREDENTIALS"))


@dataclass
class GoogleGuaranteedConfig:
    client_id: str = field(default_factory=lambda: _get("GOOGLE_GUARANTEED_CLIENT_ID"))
    client_secret: str = field(default_factory=lambda: _get("GOOGLE_GUARANTEED_CLIENT_SECRET"))
    refresh_token: str = field(default_factory=lambda: _get("GOOGLE_GUARANTEED_REFRESH_TOKEN"))


@dataclass
class GoogleBusinessConfig:
    account_id: str = field(default_factory=lambda: _get("GOOGLE_BUSINESS_ACCOUNT_ID"))
    location_id: str = field(default_factory=lambda: _get("GOOGLE_BUSINESS_LOCATION_ID"))
    client_id: str = field(default_factory=lambda: _get("GOOGLE_BUSINESS_CLIENT_ID"))
    client_secret: str = field(default_factory=lambda: _get("GOOGLE_BUSINESS_CLIENT_SECRET"))
    refresh_token: str = field(default_factory=lambda: _get("GOOGLE_BUSINESS_REFRESH_TOKEN"))


@dataclass
class FacebookConfig:
    app_id: str = field(default_factory=lambda: _get("FACEBOOK_APP_ID"))
    app_secret: str = field(default_factory=lambda: _get("FACEBOOK_APP_SECRET"))
    access_token: str = field(default_factory=lambda: _get("FACEBOOK_ACCESS_TOKEN"))
    ad_account_id: str = field(default_factory=lambda: _get("FACEBOOK_AD_ACCOUNT_ID"))


@dataclass
class InstagramConfig:
    access_token: str = field(default_factory=lambda: _get("INSTAGRAM_ACCESS_TOKEN"))
    business_account_id: str = field(default_factory=lambda: _get("INSTAGRAM_BUSINESS_ACCOUNT_ID"))


@dataclass
class YouTubeConfig:
    client_id: str = field(default_factory=lambda: _get("YOUTUBE_CLIENT_ID"))
    client_secret: str = field(default_factory=lambda: _get("YOUTUBE_CLIENT_SECRET"))
    refresh_token: str = field(default_factory=lambda: _get("YOUTUBE_REFRESH_TOKEN"))
    channel_id: str = field(default_factory=lambda: _get("YOUTUBE_CHANNEL_ID"))


@dataclass
class BigQueryConfig:
    project_id: str = field(default_factory=lambda: _get("BIGQUERY_PROJECT_ID"))
    dataset_id: str = field(default_factory=lambda: _get("BIGQUERY_DATASET_ID", "marketing_data"))
    credentials_json: str = field(default_factory=lambda: _get("GOOGLE_APPLICATION_CREDENTIALS"))
    location: str = field(default_factory=lambda: _get("BIGQUERY_LOCATION", "US"))


@dataclass
class Settings:
    google_ads: GoogleAdsConfig = field(default_factory=GoogleAdsConfig)
    ga4: GA4Config = field(default_factory=GA4Config)
    google_guaranteed: GoogleGuaranteedConfig = field(default_factory=GoogleGuaranteedConfig)
    google_business: GoogleBusinessConfig = field(default_factory=GoogleBusinessConfig)
    facebook: FacebookConfig = field(default_factory=FacebookConfig)
    instagram: InstagramConfig = field(default_factory=InstagramConfig)
    youtube: YouTubeConfig = field(default_factory=YouTubeConfig)
    bigquery: BigQueryConfig = field(default_factory=BigQueryConfig)

    # Default date range: last 30 days
    days_back: int = field(default_factory=lambda: int(_get("DAYS_BACK", "30")))

    def validate(self, connector_name: str) -> list[str]:
        """Return list of missing required fields for a given connector."""
        config_map = {
            "google_ads": self.google_ads,
            "ga4": self.ga4,
            "google_guaranteed": self.google_guaranteed,
            "google_business": self.google_business,
            "facebook": self.facebook,
            "instagram": self.instagram,
            "youtube": self.youtube,
            "bigquery": self.bigquery,
        }
        cfg = config_map.get(connector_name)
        if not cfg:
            return [f"Unknown connector: {connector_name}"]

        missing = []
        for fld_name, fld_val in cfg.__dict__.items():
            if not fld_val:
                missing.append(fld_name)
        return missing
