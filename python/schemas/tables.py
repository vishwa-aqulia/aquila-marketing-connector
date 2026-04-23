"""
BigQuery table schemas for all marketing data sources.
Each schema is a list of (column_name, bq_type) tuples.
The loader uses these to auto-create tables if they don't exist.
"""

from google.cloud.bigquery import SchemaField

def _schema(fields: list[tuple[str, str]]) -> list[SchemaField]:
    return [SchemaField(name, dtype, mode="NULLABLE") for name, dtype in fields]


TABLE_SCHEMAS: dict[str, list[SchemaField]] = {

    # ===== Google Ads =====
    "google_ads_campaigns": _schema([
        ("date", "DATE"),
        ("campaign_id", "STRING"),
        ("campaign_name", "STRING"),
        ("status", "STRING"),
        ("channel_type", "STRING"),
        ("impressions", "INTEGER"),
        ("clicks", "INTEGER"),
        ("cost", "FLOAT"),
        ("conversions", "FLOAT"),
        ("conversion_value", "FLOAT"),
        ("ctr", "FLOAT"),
        ("avg_cpc", "FLOAT"),
    ]),

    "google_ads_ad_groups": _schema([
        ("date", "DATE"),
        ("ad_group_id", "STRING"),
        ("ad_group_name", "STRING"),
        ("ad_group_status", "STRING"),
        ("campaign_id", "STRING"),
        ("campaign_name", "STRING"),
        ("impressions", "INTEGER"),
        ("clicks", "INTEGER"),
        ("cost", "FLOAT"),
        ("conversions", "FLOAT"),
        ("ctr", "FLOAT"),
        ("avg_cpc", "FLOAT"),
    ]),

    "google_ads_keywords": _schema([
        ("date", "DATE"),
        ("keyword", "STRING"),
        ("match_type", "STRING"),
        ("quality_score", "INTEGER"),
        ("campaign_name", "STRING"),
        ("ad_group_name", "STRING"),
        ("impressions", "INTEGER"),
        ("clicks", "INTEGER"),
        ("cost", "FLOAT"),
        ("conversions", "FLOAT"),
        ("ctr", "FLOAT"),
        ("avg_cpc", "FLOAT"),
    ]),

    # ===== GA4 =====
    "ga4_traffic": _schema([
        ("date", "STRING"),
        ("sessionDefaultChannelGroup", "STRING"),
        ("deviceCategory", "STRING"),
        ("sessions", "INTEGER"),
        ("totalUsers", "INTEGER"),
        ("newUsers", "INTEGER"),
        ("screenPageViews", "INTEGER"),
        ("bounceRate", "FLOAT"),
        ("averageSessionDuration", "FLOAT"),
        ("engagedSessions", "INTEGER"),
    ]),

    "ga4_pages": _schema([
        ("date", "STRING"),
        ("pagePath", "STRING"),
        ("pageTitle", "STRING"),
        ("screenPageViews", "INTEGER"),
        ("totalUsers", "INTEGER"),
        ("averageSessionDuration", "FLOAT"),
        ("bounceRate", "FLOAT"),
    ]),

    "ga4_events": _schema([
        ("date", "STRING"),
        ("eventName", "STRING"),
        ("eventCount", "INTEGER"),
        ("totalUsers", "INTEGER"),
    ]),

    "ga4_conversions": _schema([
        ("date", "STRING"),
        ("sessionDefaultChannelGroup", "STRING"),
        ("eventName", "STRING"),
        ("conversions", "INTEGER"),
        ("totalRevenue", "FLOAT"),
    ]),

    "ga4_sources": _schema([
        ("date", "STRING"),
        ("sessionSource", "STRING"),
        ("sessionMedium", "STRING"),
        ("sessionCampaignName", "STRING"),
        ("sessions", "INTEGER"),
        ("totalUsers", "INTEGER"),
        ("conversions", "INTEGER"),
    ]),

    # ===== Google Guaranteed =====
    "google_guaranteed_leads": _schema([
        ("lead_id", "STRING"),
        ("lead_type", "STRING"),
        ("lead_category", "STRING"),
        ("charge_status", "STRING"),
        ("currency_code", "STRING"),
        ("charged_amount_micros", "INTEGER"),
        ("lead_creation_time", "STRING"),
        ("geo_location", "STRING"),
        ("business_name", "STRING"),
    ]),

    "google_guaranteed_account": _schema([
        ("account_id", "STRING"),
        ("average_weekly_budget_micros", "INTEGER"),
        ("total_charged_leads", "INTEGER"),
        ("total_charged_amount_micros", "INTEGER"),
        ("phone_lead_responsiveness", "FLOAT"),
        ("current_period_start", "STRING"),
        ("current_period_end", "STRING"),
    ]),

    # ===== Google Business Profile =====
    "gbp_performance": _schema([
        ("date", "STRING"),
        ("metric", "STRING"),
        ("value", "INTEGER"),
        ("location", "STRING"),
    ]),

    "gbp_reviews": _schema([
        ("review_id", "STRING"),
        ("reviewer_name", "STRING"),
        ("star_rating", "STRING"),
        ("comment", "STRING"),
        ("create_time", "STRING"),
        ("update_time", "STRING"),
        ("reply_comment", "STRING"),
        ("reply_time", "STRING"),
    ]),

    # ===== Facebook =====
    "facebook_campaigns": _schema([
        ("date", "STRING"),
        ("campaign_id", "STRING"),
        ("campaign_name", "STRING"),
        ("impressions", "INTEGER"),
        ("clicks", "INTEGER"),
        ("spend", "FLOAT"),
        ("cpc", "FLOAT"),
        ("cpm", "FLOAT"),
        ("ctr", "FLOAT"),
        ("reach", "INTEGER"),
        ("frequency", "FLOAT"),
    ]),

    "facebook_ad_sets": _schema([
        ("date", "STRING"),
        ("campaign_id", "STRING"),
        ("campaign_name", "STRING"),
        ("adset_id", "STRING"),
        ("adset_name", "STRING"),
        ("impressions", "INTEGER"),
        ("clicks", "INTEGER"),
        ("spend", "FLOAT"),
        ("cpc", "FLOAT"),
        ("cpm", "FLOAT"),
        ("ctr", "FLOAT"),
        ("reach", "INTEGER"),
    ]),

    "facebook_ads": _schema([
        ("date", "STRING"),
        ("campaign_id", "STRING"),
        ("campaign_name", "STRING"),
        ("adset_id", "STRING"),
        ("adset_name", "STRING"),
        ("ad_id", "STRING"),
        ("ad_name", "STRING"),
        ("impressions", "INTEGER"),
        ("clicks", "INTEGER"),
        ("spend", "FLOAT"),
        ("cpc", "FLOAT"),
        ("cpm", "FLOAT"),
        ("ctr", "FLOAT"),
    ]),

    # ===== Instagram =====
    "instagram_account_insights": _schema([
        ("date", "STRING"),
        ("impressions", "INTEGER"),
        ("reach", "INTEGER"),
        ("follower_count", "INTEGER"),
        ("profile_views", "INTEGER"),
        ("website_clicks", "INTEGER"),
    ]),

    "instagram_media": _schema([
        ("post_id", "STRING"),
        ("caption", "STRING"),
        ("media_type", "STRING"),
        ("timestamp", "STRING"),
        ("permalink", "STRING"),
        ("like_count", "INTEGER"),
        ("comments_count", "INTEGER"),
        ("impressions", "INTEGER"),
        ("reach", "INTEGER"),
        ("saved", "INTEGER"),
        ("video_views", "INTEGER"),
    ]),

    # ===== YouTube =====
    "youtube_channel": _schema([
        ("channel_id", "STRING"),
        ("channel_title", "STRING"),
        ("subscriber_count", "INTEGER"),
        ("view_count", "INTEGER"),
        ("video_count", "INTEGER"),
        ("snapshot_date", "DATE"),
    ]),

    "youtube_videos": _schema([
        ("video_id", "STRING"),
        ("title", "STRING"),
        ("published_at", "STRING"),
        ("description", "STRING"),
        ("duration", "STRING"),
        ("view_count", "INTEGER"),
        ("like_count", "INTEGER"),
        ("comment_count", "INTEGER"),
        ("favorite_count", "INTEGER"),
        ("snapshot_date", "DATE"),
    ]),

    "youtube_daily_analytics": _schema([
        ("date", "STRING"),
        ("views", "INTEGER"),
        ("estimatedMinutesWatched", "FLOAT"),
        ("averageViewDuration", "FLOAT"),
        ("likes", "INTEGER"),
        ("dislikes", "INTEGER"),
        ("shares", "INTEGER"),
        ("subscribersGained", "INTEGER"),
        ("subscribersLost", "INTEGER"),
    ]),

    "youtube_traffic_sources": _schema([
        ("insightTrafficSourceType", "STRING"),
        ("views", "INTEGER"),
        ("estimatedMinutesWatched", "FLOAT"),
        ("period_start", "STRING"),
        ("period_end", "STRING"),
    ]),
}
