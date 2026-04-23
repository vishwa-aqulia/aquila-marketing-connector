#!/usr/bin/env python3
"""
Smoke Test — Validates configuration, authentication, and a small data pull
for each connector. Run this first to verify your setup.

Usage:
    python smoke_test.py                         # Test all connectors
    python smoke_test.py --connectors google_ads  # Test specific ones
"""

import argparse
import logging
import sys
import json
from datetime import datetime, timedelta

from config import Settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("smoke_test")


def test_connector(name: str, settings: Settings) -> dict:
    """Test a single connector: validate config → authenticate → small extract."""
    result = {"connector": name, "config": "FAIL", "auth": "SKIP", "extract": "SKIP"}

    # 1. Config check
    missing = settings.validate(name)
    if missing:
        result["config"] = f"MISSING: {', '.join(missing)}"
        return result
    result["config"] = "OK"

    # 2. Import and instantiate
    from connectors import (
        GoogleAdsConnector, GA4Connector, GoogleGuaranteedConnector,
        GoogleBusinessConnector, FacebookAdsConnector, InstagramConnector,
        YouTubeConnector,
    )
    cls_map = {
        "google_ads": GoogleAdsConnector,
        "ga4": GA4Connector,
        "google_guaranteed": GoogleGuaranteedConnector,
        "google_business": GoogleBusinessConnector,
        "facebook": FacebookAdsConnector,
        "instagram": InstagramConnector,
        "youtube": YouTubeConnector,
    }
    cls = cls_map[name]
    connector = cls(settings)

    # 3. Authenticate
    try:
        connector.authenticate()
        result["auth"] = "OK"
    except Exception as e:
        result["auth"] = f"FAIL: {e}"
        return result

    # 4. Small extract (last 2 days)
    try:
        end = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        start = end - timedelta(days=2)
        data = connector.extract(start, end)
        tables = {k: len(v) for k, v in data.items()}
        total = sum(tables.values())
        result["extract"] = f"OK — {total} rows: {tables}"
    except Exception as e:
        result["extract"] = f"FAIL: {e}"

    return result


def test_bigquery(settings: Settings) -> dict:
    """Test BigQuery connection and permissions."""
    result = {"connector": "bigquery", "config": "FAIL", "auth": "SKIP", "write": "SKIP"}

    missing = settings.validate("bigquery")
    if missing:
        result["config"] = f"MISSING: {', '.join(missing)}"
        return result
    result["config"] = "OK"

    try:
        from loader import BigQueryLoader
        loader = BigQueryLoader(settings)
        loader.authenticate()
        result["auth"] = "OK"
    except Exception as e:
        result["auth"] = f"FAIL: {e}"
        return result

    # Try creating the dataset (non-destructive)
    try:
        loader.ensure_dataset()
        result["write"] = "OK — dataset verified"
    except Exception as e:
        result["write"] = f"FAIL: {e}"

    return result


def main():
    parser = argparse.ArgumentParser(description="Smoke Test — Marketing Data Connector")
    parser.add_argument(
        "--connectors", nargs="+",
        default=["google_ads", "ga4", "google_guaranteed", "google_business",
                 "facebook", "instagram", "youtube"],
    )
    parser.add_argument("--skip-extract", action="store_true",
                        help="Only test config and auth, skip data extraction")
    args = parser.parse_args()

    settings = Settings()
    results = []

    print()
    print("=" * 70)
    print("  MARKETING DATA CONNECTOR — SMOKE TEST")
    print("=" * 70)
    print()

    for name in args.connectors:
        log.info(f"Testing {name}...")
        r = test_connector(name, settings)
        results.append(r)
        _print_result(r)
        print()

    # Always test BigQuery
    log.info("Testing BigQuery...")
    bq = test_bigquery(settings)
    results.append(bq)
    _print_result(bq)

    # Summary
    print()
    print("=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    passed = sum(1 for r in results if "FAIL" not in str(r.values()))
    total = len(results)
    for r in results:
        status = "PASS" if "FAIL" not in str(r.values()) else "FAIL"
        icon = "[+]" if status == "PASS" else "[-]"
        print(f"  {icon}  {r['connector']:25s}  {status}")

    print()
    print(f"  {passed}/{total} connectors passed")
    print("=" * 70)

    if passed < total:
        print()
        print("  NEXT STEPS for failed connectors:")
        print("  1. Check .env file has correct credentials")
        print("  2. Verify API access is enabled in Google Cloud / Meta console")
        print("  3. Run with --connectors <name> to retest individually")
        print()

    return 0 if passed == total else 1


def _print_result(r: dict):
    name = r["connector"]
    for key in ["config", "auth", "extract", "write"]:
        if key in r:
            val = r[key]
            tag = "[+]" if val.startswith("OK") else "[-]"
            print(f"  {tag}  {name:20s}  {key:10s}  {val}")


if __name__ == "__main__":
    sys.exit(main())
