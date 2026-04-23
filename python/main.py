#!/usr/bin/env python3
"""
Marketing Data Connector — Main Orchestrator

Extracts data from Google Ads, GA4, Google Guaranteed, Google Business Profile,
Facebook Ads, Instagram, and YouTube, then loads it into BigQuery.

Usage:
    python main.py                        # Run all connectors
    python main.py --connectors google_ads ga4  # Run specific connectors
    python main.py --days-back 7          # Last 7 days
    python main.py --dry-run              # Extract only, don't load to BQ

Setup:
    1. Copy .env.example to .env
    2. Fill in your API credentials
    3. pip install -r requirements.txt
    4. python main.py
"""

import argparse
import json
import logging
import sys
from datetime import datetime

from config import Settings
from connectors import (
    GoogleAdsConnector,
    GA4Connector,
    GoogleGuaranteedConnector,
    GoogleBusinessConnector,
    FacebookAdsConnector,
    InstagramConnector,
    YouTubeConnector,
)
from loader import BigQueryLoader

# Map of connector names to classes
CONNECTOR_MAP = {
    "google_ads": GoogleAdsConnector,
    "ga4": GA4Connector,
    "google_guaranteed": GoogleGuaranteedConnector,
    "google_business": GoogleBusinessConnector,
    "facebook": FacebookAdsConnector,
    "instagram": InstagramConnector,
    "youtube": YouTubeConnector,
}

ALL_CONNECTORS = list(CONNECTOR_MAP.keys())


def setup_logging(verbose: bool = False):
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s  %(levelname)-8s  %(name)-25s  %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def run(
    connector_names: list[str],
    settings: Settings,
    days_back: int = 30,
    dry_run: bool = False,
    write_disposition: str = "WRITE_TRUNCATE",
) -> dict:
    """
    Run the full extract → load pipeline.

    Returns a summary dict with status per connector.
    """
    import time
    summary = {}
    all_data: dict[str, list[dict]] = {}
    logger = logging.getLogger("orchestrator")

    # --- Extract phase ---
    for name in connector_names:
        logger.info(f"{'─' * 50}")
        logger.info(f"▶  Connector: {name.upper()}")

        cls = CONNECTOR_MAP.get(name)
        if not cls:
            logger.error(f"[{name}] Unknown connector — skipping")
            summary[name] = {"status": "error", "message": "Unknown connector"}
            continue

        # Check config
        missing = settings.validate(name)
        if missing:
            logger.warning(f"[{name}] Missing credentials: {', '.join(missing)}")
            logger.warning(f"[{name}] ↳ Skipped. Add credentials in the Configuration page.")
            summary[name] = {"status": "skipped", "missing_config": missing}
            continue

        connector = cls(settings)
        t0 = time.time()
        try:
            logger.info(f"[{name}] Authenticating...")
            connector.authenticate()
            logger.info(f"[{name}] ✓ Authentication successful ({time.time() - t0:.1f}s)")
        except Exception as e:
            logger.error(f"[{name}] ✗ Authentication failed: {e}")
            summary[name] = {"status": "auth_failed", "error": str(e)}
            continue

        start, end = connector.get_date_range(days_back)
        logger.info(f"[{name}] Extracting data: {start.date()} → {end.date()} ({days_back} days)...")
        t1 = time.time()

        data = connector.safe_extract(start, end)
        elapsed = time.time() - t1
        if data:
            all_data.update(data)
            row_counts = {k: len(v) for k, v in data.items()}
            total_rows = sum(row_counts.values())
            summary[name] = {"status": "extracted", "tables": row_counts}
            logger.info(f"[{name}] ✓ Extraction complete — {total_rows} rows across {len(row_counts)} tables ({elapsed:.1f}s)")
            for table, count in row_counts.items():
                logger.info(f"[{name}]   · {table}: {count} rows")
        else:
            summary[name] = {"status": "no_data"}
            logger.warning(f"[{name}] ↳ No data returned for date range ({elapsed:.1f}s)")

    logger.info(f"{'─' * 50}")

    # --- Load phase ---
    if dry_run:
        logger.info("DRY RUN — skipping BigQuery load")
        for name, info in summary.items():
            if info.get("status") == "extracted":
                info["status"] = "extracted_dry_run"
        return summary

    if not all_data:
        logger.warning("No data extracted across any connector — skipping BigQuery load")
        return summary

    # Validate BQ config
    bq_missing = settings.validate("bigquery")
    if bq_missing:
        logger.error(f"BigQuery config missing: {', '.join(bq_missing)} — cannot load data")
        summary["bigquery_load"] = {"status": "failed", "error": f"Missing config: {', '.join(bq_missing)}"}
        return summary

    logger.info(f"{'─' * 50}")
    logger.info("▶  BigQuery Load")
    loader = BigQueryLoader(settings)
    try:
        logger.info("Authenticating with BigQuery...")
        loader.authenticate()
        logger.info(f"Loading {len(all_data)} tables into BigQuery (mode: {write_disposition})...")
        t2 = time.time()
        load_results = loader.load_all(all_data, write_disposition)
        logger.info(f"✓ BigQuery load complete ({time.time() - t2:.1f}s)")
        for table, rows in load_results.items():
            logger.info(f"  · {table}: {rows} rows loaded")
        summary["bigquery_load"] = {"status": "success", "tables": load_results}
    except Exception as e:
        logger.error(f"✗ BigQuery load failed: {e}", exc_info=True)
        summary["bigquery_load"] = {"status": "failed", "error": str(e)}

    return summary


def main():
    parser = argparse.ArgumentParser(description="Marketing Data → BigQuery Pipeline")
    parser.add_argument(
        "--connectors", nargs="+", default=ALL_CONNECTORS,
        choices=ALL_CONNECTORS,
        help="Which connectors to run (default: all)",
    )
    parser.add_argument(
        "--days-back", type=int, default=None,
        help="Number of days to look back (default: from DAYS_BACK env or 30)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Extract data but don't load to BigQuery",
    )
    parser.add_argument(
        "--append", action="store_true",
        help="Append to existing tables instead of replacing",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Enable debug logging",
    )
    args = parser.parse_args()

    setup_logging(args.verbose)
    logger = logging.getLogger("main")

    settings = Settings()
    days = args.days_back or settings.days_back
    disposition = "WRITE_APPEND" if args.append else "WRITE_TRUNCATE"

    logger.info("=" * 60)
    logger.info("Marketing Data Connector — Starting Pipeline")
    logger.info(f"Connectors: {', '.join(args.connectors)}")
    logger.info(f"Date range: last {days} days")
    logger.info(f"Mode: {'DRY RUN' if args.dry_run else disposition}")
    logger.info("=" * 60)

    summary = run(
        connector_names=args.connectors,
        settings=settings,
        days_back=days,
        dry_run=args.dry_run,
        write_disposition=disposition,
    )

    # Print summary
    logger.info("")
    logger.info("=" * 60)
    logger.info("PIPELINE SUMMARY")
    logger.info("=" * 60)
    for name, info in summary.items():
        status = info.get("status", "unknown")
        detail = ""
        if "tables" in info:
            total_rows = sum(info["tables"].values())
            detail = f" — {total_rows} rows across {len(info['tables'])} tables"
        elif "error" in info:
            detail = f" — {info['error']}"
        elif "missing_config" in info:
            detail = f" — missing: {', '.join(info['missing_config'])}"
        logger.info(f"  {name:25s}  {status:20s}{detail}")
    logger.info("=" * 60)

    # Determine overall outcome for exit code
    connector_statuses = [v.get("status") for k, v in summary.items() if k != "bigquery_load"]
    any_extracted = any(s in ("extracted", "extracted_dry_run") for s in connector_statuses)
    any_failed = any(s in ("auth_failed", "error", "failed") for s in connector_statuses)
    bq_failed = summary.get("bigquery_load", {}).get("status") == "failed"

    if not any_extracted or bq_failed:
        if not any_failed and not bq_failed:
            logger.warning("All connectors were skipped — no credentials configured.")
        logger.info("Pipeline finished with no successful extractions.")
        print(f"__SUMMARY_JSON__:{json.dumps(summary)}", flush=True)
        sys.exit(1)

    print(f"__SUMMARY_JSON__:{json.dumps(summary)}", flush=True)


if __name__ == "__main__":
    main()
