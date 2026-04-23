"""
Google Guaranteed / Local Services Ads connector.
Extracts lead data via the Local Services API.
"""

from datetime import datetime
from .base import BaseConnector

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


class GoogleGuaranteedConnector(BaseConnector):
    def __init__(self, settings):
        super().__init__("google_guaranteed", settings)
        self.cfg = settings.google_guaranteed
        # Reuse Google Ads customer ID for the GLS account
        self.customer_id = settings.google_ads.customer_id.replace("-", "")

    def authenticate(self) -> bool:
        creds = Credentials(
            token=None,
            refresh_token=self.cfg.refresh_token,
            client_id=self.cfg.client_id,
            client_secret=self.cfg.client_secret,
            token_uri="https://oauth2.googleapis.com/token",
        )
        self._client = build("localservices", "v1", credentials=creds)
        self.logger.info("Google Guaranteed authentication successful")
        return True

    def extract(self, start_date: datetime, end_date: datetime) -> dict[str, list[dict]]:
        s = start_date.strftime("%Y-%m-%dT00:00:00Z")
        e = end_date.strftime("%Y-%m-%dT23:59:59Z")

        results = {}

        # --- Detailed lead reports ---
        leads = self._fetch_detailed_leads(s, e)
        results["google_guaranteed_leads"] = leads

        # --- Aggregated account-level report ---
        account_report = self._fetch_account_report(s, e)
        results["google_guaranteed_account"] = account_report

        total = sum(len(v) for v in results.values())
        self.logger.info(f"Google Guaranteed: extracted {total} rows")
        return results

    def _fetch_detailed_leads(self, start: str, end: str) -> list[dict]:
        """Fetch individual lead records."""
        rows = []
        request = self._client.detailedLeadReports().search(
            query=f'start_date>="{start}" AND end_date<="{end}"',
            pageSize=500,
        )

        while request is not None:
            response = request.execute()
            for lead in response.get("detailedLeadReports", []):
                rows.append({
                    "lead_id": lead.get("leadId", ""),
                    "lead_type": lead.get("leadType", ""),
                    "lead_category": lead.get("leadCategory", ""),
                    "charge_status": lead.get("chargeStatus", ""),
                    "currency_code": lead.get("currencyCode", ""),
                    "charged_amount_micros": lead.get("aggregatorInfo", {}).get(
                        "chargedAmountMicros", 0
                    ),
                    "lead_creation_time": lead.get("leadCreationTimestamp", ""),
                    "geo_location": lead.get("geo", ""),
                    "business_name": lead.get("businessName", ""),
                })
            request = self._client.detailedLeadReports().search_next(request, response)
        return rows

    def _fetch_account_report(self, start: str, end: str) -> list[dict]:
        """Fetch account-level aggregated report."""
        rows = []
        request = self._client.accountReports().search(
            query=f'start_date>="{start}" AND end_date<="{end}"',
            pageSize=500,
        )

        while request is not None:
            response = request.execute()
            for report in response.get("accountReports", []):
                rows.append({
                    "account_id": report.get("accountId", ""),
                    "average_weekly_budget_micros": report.get(
                        "averageWeeklyBudgetMicros", 0
                    ),
                    "total_charged_leads": report.get("totalChargedLeads", 0),
                    "total_charged_amount_micros": report.get(
                        "totalChargedAmountMicros", 0
                    ),
                    "phone_lead_responsiveness": report.get(
                        "phoneLeadResponsiveness", 0
                    ),
                    "current_period_start": start,
                    "current_period_end": end,
                })
            request = self._client.accountReports().search_next(request, response)
        return rows
