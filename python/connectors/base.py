"""
Abstract base class for all marketing data connectors.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timedelta
import logging


class BaseConnector(ABC):
    """Every connector must implement authenticate() and extract()."""

    def __init__(self, name: str, settings):
        self.name = name
        self.settings = settings
        self.logger = logging.getLogger(f"connector.{name}")
        self._client = None

    @abstractmethod
    def authenticate(self) -> bool:
        """Set up API client. Return True on success."""
        ...

    @abstractmethod
    def extract(self, start_date: datetime, end_date: datetime) -> dict[str, list[dict]]:
        """
        Extract data for the given date range.
        Returns {table_name: [row_dicts, ...]}.
        """
        ...

    def get_date_range(self, days_back: int = 30) -> tuple[datetime, datetime]:
        end = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        start = end - timedelta(days=days_back)
        return start, end

    def safe_extract(self, start_date: datetime, end_date: datetime) -> dict[str, list[dict]]:
        """Wrapper that catches and logs errors."""
        try:
            return self.extract(start_date, end_date)
        except Exception as e:
            self.logger.error(f"[{self.name}] Extraction failed: {e}", exc_info=True)
            return {}
