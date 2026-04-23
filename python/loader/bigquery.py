"""
BigQuery loader — creates dataset/tables and loads extracted data.
Supports both WRITE_TRUNCATE (replace) and WRITE_APPEND modes.
"""

import logging
from google.cloud import bigquery
from google.cloud.exceptions import NotFound

from schemas.tables import TABLE_SCHEMAS

logger = logging.getLogger("loader.bigquery")


class BigQueryLoader:
    def __init__(self, settings):
        self.cfg = settings.bigquery
        self._client = None

    def authenticate(self) -> bool:
        self._client = bigquery.Client(
            project=self.cfg.project_id,
            location=self.cfg.location,
        )
        # Quick validation — list datasets
        list(self._client.list_datasets(max_results=1))
        logger.info(
            f"BigQuery connected — project={self.cfg.project_id}, "
            f"dataset={self.cfg.dataset_id}"
        )
        return True

    def ensure_dataset(self):
        """Create dataset if it doesn't exist."""
        dataset_ref = f"{self.cfg.project_id}.{self.cfg.dataset_id}"
        try:
            self._client.get_dataset(dataset_ref)
            logger.info(f"Dataset {dataset_ref} already exists")
        except NotFound:
            dataset = bigquery.Dataset(dataset_ref)
            dataset.location = self.cfg.location
            self._client.create_dataset(dataset)
            logger.info(f"Created dataset {dataset_ref}")

    def ensure_table(self, table_name: str):
        """Create table with predefined schema if it doesn't exist."""
        table_id = f"{self.cfg.project_id}.{self.cfg.dataset_id}.{table_name}"
        schema = TABLE_SCHEMAS.get(table_name)

        if not schema:
            logger.warning(
                f"No predefined schema for '{table_name}' — "
                "table will use auto-detect on first load"
            )
            return

        try:
            self._client.get_table(table_id)
            logger.info(f"Table {table_id} already exists")
        except NotFound:
            table = bigquery.Table(table_id, schema=schema)
            table.time_partitioning = bigquery.TimePartitioning(
                type_=bigquery.TimePartitioningType.DAY,
                field="date" if any(f.name == "date" for f in schema) else None,
            )
            self._client.create_table(table)
            logger.info(f"Created table {table_id}")

    def load_data(
        self,
        table_name: str,
        rows: list[dict],
        write_disposition: str = "WRITE_TRUNCATE",
    ) -> int:
        """
        Load rows into a BigQuery table.

        Args:
            table_name: Target table name (will be created in the configured dataset).
            rows: List of row dicts.
            write_disposition: WRITE_TRUNCATE (replace) or WRITE_APPEND.

        Returns:
            Number of rows loaded.
        """
        if not rows:
            logger.info(f"No data for {table_name} — skipping")
            return 0

        table_id = f"{self.cfg.project_id}.{self.cfg.dataset_id}.{table_name}"

        self.ensure_table(table_name)

        schema = TABLE_SCHEMAS.get(table_name)

        job_config = bigquery.LoadJobConfig(
            write_disposition=write_disposition,
            source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
        )
        if schema:
            job_config.schema = schema
        else:
            job_config.autodetect = True

        # Filter rows to only include known schema columns if schema exists
        if schema:
            known_cols = {f.name for f in schema}
            cleaned_rows = [{k: v for k, v in row.items() if k in known_cols} for row in rows]
        else:
            cleaned_rows = rows

        import json
        import io

        ndjson = "\n".join(json.dumps(row) for row in cleaned_rows)
        data_file = io.BytesIO(ndjson.encode("utf-8"))

        job = self._client.load_table_from_file(
            data_file, table_id, job_config=job_config
        )
        job.result()  # Wait for completion

        logger.info(f"Loaded {len(cleaned_rows)} rows into {table_id}")
        return len(cleaned_rows)

    def load_all(self, data: dict[str, list[dict]], write_disposition: str = "WRITE_TRUNCATE") -> dict[str, int]:
        """Load all extracted data into BigQuery. Returns {table: row_count}."""
        self.ensure_dataset()
        results = {}
        for table_name, rows in data.items():
            count = self.load_data(table_name, rows, write_disposition)
            results[table_name] = count
        return results
