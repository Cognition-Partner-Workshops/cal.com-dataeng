# Cal.com Data Engineering Pipeline Documentation

This document provides comprehensive documentation for the cal.com data engineering pipeline, an ELT (Extract-Load-Transform) system that ingests booking data from a PostgreSQL database into Databricks Delta Lake. The infrastructure is defined using Terraform.

## Architecture Overview

The cal.com data engineering pipeline implements a single-source ELT pattern that moves booking data from the Cal.com PostgreSQL database to a Databricks Delta Lake for analytics and reporting purposes.

```
┌─────────────────┐     ┌─────────────────────────┐     ┌─────────────────────┐
│   PostgreSQL    │     │      Databricks         │     │    Delta Lake       │
│   (Source)      │────▶│   PySpark Notebook      │────▶│  (Destination)      │
│                 │     │                         │     │                     │
│  Booking Table  │     │  - JDBC Connection      │     │  Unity Catalog:     │
│  (camelCase)    │     │  - Column Transformation│     │  catalog.schema.    │
│                 │     │  - Metadata Enrichment  │     │  booking            │
└─────────────────┘     └─────────────────────────┘     └─────────────────────┘
                                    │
                                    │
                        ┌───────────▼───────────┐
                        │   Databricks Secrets  │
                        │   (Credentials)       │
                        └───────────────────────┘
```

The pipeline follows these core principles:

1. **Extract**: Data is read from the PostgreSQL `Booking` table using JDBC connectivity
2. **Load**: Data is written to Delta Lake in Unity Catalog with full table overwrites
3. **Transform**: Minimal transformation occurs during extraction (column renaming from camelCase to snake_case) and loading (metadata enrichment)

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Source Database | PostgreSQL | Stores Cal.com booking records |
| Processing Platform | Databricks | Executes PySpark notebooks for data processing |
| Storage Layer | Delta Lake | ACID-compliant data lake storage |
| Data Governance | Unity Catalog | Centralized metadata management and access control |
| Infrastructure as Code | Terraform | Provisions and manages all Databricks resources |
| Query Engine | SQL Warehouse | Enables SQL-based analytics for downstream consumers |

## Data Flow

The complete data journey from PostgreSQL to Delta Lake follows these steps:

1. **Credential Retrieval**: The PySpark notebook retrieves PostgreSQL connection credentials from Databricks Secrets at runtime
2. **JDBC Connection**: A connection is established to the PostgreSQL database using the retrieved credentials
3. **Data Extraction**: The SQL query reads from the `Booking` table, transforming column names from camelCase to snake_case
4. **Metadata Enrichment**: Ingestion metadata columns (`_ingested_at`, `_source_system`) are added to the DataFrame
5. **Delta Lake Write**: The enriched data is written to the Delta Lake table in Unity Catalog using overwrite mode

## Key Components

### 1. Secret Management (data_pipeline.tf, lines 1-33)

The pipeline uses Databricks Secret Scopes to securely store and retrieve PostgreSQL connection credentials. This approach ensures that sensitive information is never hardcoded in notebooks or configuration files.

**Secret Scope Creation:**
```hcl
resource "databricks_secret_scope" "calcom" {
  name = "calcom-postgres-credentials"
}
```

The secret scope named `calcom-postgres-credentials` serves as a secure container for all PostgreSQL connection parameters.

**Individual Secrets:**

The following five secrets are created within the scope:

| Secret Key | Description | Source Variable |
|------------|-------------|-----------------|
| `postgres_host` | PostgreSQL server hostname | `var.postgres_host` |
| `postgres_port` | PostgreSQL server port (converted to string) | `var.postgres_port` |
| `postgres_database` | Database name | `var.postgres_database` |
| `postgres_user` | Database username | `var.postgres_user` |
| `postgres_password` | Database password (sensitive) | `var.postgres_password` |

Each secret is created as a Terraform resource that stores the value from the corresponding input variable:

```hcl
resource "databricks_secret" "postgres_host" {
  key          = "postgres_host"
  string_value = var.postgres_host
  scope        = databricks_secret_scope.calcom.name
}
```

**Runtime Retrieval:**

At runtime, the PySpark notebook retrieves these credentials using the `dbutils.secrets.get()` function:

```python
postgres_host = dbutils.secrets.get(scope="calcom-postgres-credentials", key="postgres_host")
postgres_port = dbutils.secrets.get(scope="calcom-postgres-credentials", key="postgres_port")
postgres_database = dbutils.secrets.get(scope="calcom-postgres-credentials", key="postgres_database")
postgres_user = dbutils.secrets.get(scope="calcom-postgres-credentials", key="postgres_user")
postgres_password = dbutils.secrets.get(scope="calcom-postgres-credentials", key="postgres_password")
```

This pattern ensures credentials are never exposed in logs or notebook outputs, as Databricks automatically redacts secret values.

### 2. PostgreSQL Source Connection (data_pipeline.tf, lines 54-66)

The pipeline connects to PostgreSQL as the primary source system using JDBC. The connection is configured within the embedded PySpark notebook.

**JDBC URL Construction:**

```python
jdbc_url = f"jdbc:postgresql://{postgres_host}:{postgres_port}/{postgres_database}"
```

The JDBC URL follows the standard PostgreSQL format: `jdbc:postgresql://host:port/database`

**Connection Properties:**

```python
connection_properties = {
    "user": postgres_user,
    "password": postgres_password,
    "driver": "org.postgresql.Driver"
}
```

The connection properties dictionary contains:
- `user`: The PostgreSQL username for authentication
- `password`: The PostgreSQL password for authentication
- `driver`: The JDBC driver class (`org.postgresql.Driver`) that Spark uses to communicate with PostgreSQL

### 3. Data Extraction Query (data_pipeline.tf, lines 77-119)

The SQL query that reads from the PostgreSQL `Booking` table performs column name transformation from camelCase (PostgreSQL convention) to snake_case (data lake convention).

**Query Structure:**

```sql
(SELECT 
    id,
    uid,
    "idempotencyKey" as idempotency_key,
    "userId" as user_id,
    "userPrimaryEmail" as user_primary_email,
    "eventTypeId" as event_type_id,
    title,
    description,
    "startTime" as start_time,
    "endTime" as end_time,
    location,
    status::text as status,
    paid,
    "cancellationReason" as cancellation_reason,
    "rejectionReason" as rejection_reason,
    "reassignReason" as reassign_reason,
    "reassignById" as reassign_by_id,
    rescheduled,
    "fromReschedule" as from_reschedule,
    "recurringEventId" as recurring_event_id,
    "smsReminderNumber" as sms_reminder_number,
    "isRecorded" as is_recorded,
    "iCalUID" as ical_uid,
    "iCalSequence" as ical_sequence,
    rating,
    "ratingFeedback" as rating_feedback,
    "noShowHost" as no_show_host,
    "cancelledBy" as cancelled_by,
    "rescheduledBy" as rescheduled_by,
    "creationSource"::text as creation_source,
    "customInputs"::text as custom_inputs,
    responses::text as responses,
    metadata::text as metadata,
    "destinationCalendarId" as destination_calendar_id,
    "dynamicEventSlugRef" as dynamic_event_slug_ref,
    "dynamicGroupSlugRef" as dynamic_group_slug_ref,
    "oneTimePassword" as one_time_password,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM "Booking") as booking_data
```

**Key Transformations:**

| Transformation Type | Example | Purpose |
|---------------------|---------|---------|
| Column Aliasing | `"userId" as user_id` | Converts camelCase to snake_case for consistency |
| Type Casting | `status::text as status` | Converts PostgreSQL enum types to text |
| JSON Handling | `metadata::text as metadata` | Converts JSONB fields to text for compatibility |

**Extracted Fields:**

The query extracts 37 fields from the Booking table, including:
- **Identifiers**: `id`, `uid`, `idempotency_key`
- **Foreign Keys**: `user_id`, `event_type_id`, `destination_calendar_id`
- **Booking Details**: `title`, `description`, `location`, `start_time`, `end_time`
- **Status Information**: `status`, `paid`, `cancellation_reason`, `rejection_reason`
- **Rescheduling Data**: `rescheduled`, `from_reschedule`, `reassign_reason`, `reassign_by_id`
- **Recurring Event Data**: `recurring_event_id`
- **Communication**: `sms_reminder_number`
- **Recording**: `is_recorded`
- **Calendar Integration**: `ical_uid`, `ical_sequence`
- **Feedback**: `rating`, `rating_feedback`, `no_show_host`
- **Audit Trail**: `cancelled_by`, `rescheduled_by`, `creation_source`
- **Flexible Data**: `custom_inputs`, `responses`, `metadata`
- **Dynamic Booking**: `dynamic_event_slug_ref`, `dynamic_group_slug_ref`
- **Security**: `one_time_password`
- **Timestamps**: `created_at`, `updated_at`

### 4. JDBC Connection and Data Reading (data_pipeline.tf, lines 122-126)

The notebook establishes the JDBC connection and reads data into a Spark DataFrame using the `spark.read.jdbc()` method.

```python
booking_df = spark.read.jdbc(
    url=jdbc_url,
    table=booking_query,
    properties=connection_properties
)
```

**Parameters:**
- `url`: The JDBC connection URL constructed from the secret values
- `table`: The SQL query wrapped in parentheses with an alias (required by Spark for subqueries)
- `properties`: The connection properties dictionary containing authentication and driver information

The `table` parameter accepts a SQL query (wrapped in parentheses with an alias) instead of just a table name, enabling the column transformations to occur at the source database level.

### 5. Metadata Enrichment (data_pipeline.tf, lines 136-138)

After extracting the data, the pipeline adds two metadata columns to track data lineage:

```python
booking_df_with_metadata = booking_df \
    .withColumn("_ingested_at", current_timestamp()) \
    .withColumn("_source_system", lit("calcom_postgres"))
```

| Column | Type | Value | Purpose |
|--------|------|-------|---------|
| `_ingested_at` | TIMESTAMP | Current timestamp | Records when the data was loaded into Delta Lake |
| `_source_system` | STRING | `"calcom_postgres"` | Identifies the source system for data lineage |

These metadata columns follow the convention of prefixing with underscore (`_`) to distinguish them from source data columns.

### 6. Delta Lake Destination (data_pipeline.tf, lines 148-156)

The extracted and enriched data is written to Delta Lake in Unity Catalog at the location `${catalog_name}.${schema_name}.booking`.

**Target Table Definition:**

```python
target_table = "${var.catalog_name}.${var.schema_name}.booking"
```

The target table uses a three-part naming convention: `catalog.schema.table`

**Write Operation:**

```python
booking_df_with_metadata.write \
    .format("delta") \
    .mode("overwrite") \
    .option("overwriteSchema", "true") \
    .saveAsTable(target_table)
```

**Write Configuration:**

| Option | Value | Purpose |
|--------|-------|---------|
| `format` | `"delta"` | Specifies Delta Lake as the storage format |
| `mode` | `"overwrite"` | Replaces the entire table contents on each run |
| `overwriteSchema` | `"true"` | Allows schema changes if the source schema evolves |
| `saveAsTable` | `target_table` | Creates or replaces the table in Unity Catalog |

The `overwrite` mode with `overwriteSchema` option provides a simple full-refresh pattern suitable for proof-of-concept implementations. Production systems might use incremental loading with merge operations.

### 7. SQL Warehouse for Downstream Consumers (outputs.tf, lines 6-9)

The pipeline outputs a JDBC URL that downstream consumers can use to query the data via SQL Warehouse.

```hcl
output "sql_warehouse_jdbc_url" {
  description = "JDBC URL for connecting to the SQL warehouse (if created)"
  value       = var.create_warehouse ? databricks_sql_endpoint.calcom_warehouse[0].jdbc_url : null
}
```

**Usage:**

The SQL Warehouse JDBC URL enables:
- **BI Tool Integration**: Tools like Tableau, Power BI, and Looker can connect using the JDBC URL
- **SQL Clients**: Database clients can query the Delta Lake tables using standard SQL
- **Application Integration**: Applications can connect programmatically to run analytics queries

The output is conditional based on the `create_warehouse` variable, returning `null` if no warehouse was created (useful when using an existing warehouse).

## Scheduled Execution

The data pipeline is configured as a Databricks Job with scheduled execution:

```hcl
resource "databricks_job" "booking_ingestion" {
  name = "calcom-booking-ingestion"

  task {
    task_key = "ingest_bookings"
    notebook_task {
      notebook_path = databricks_notebook.booking_ingestion.path
    }
  }

  schedule {
    quartz_cron_expression = "0 0 * * * ?"
    timezone_id            = "UTC"
    pause_status           = "PAUSED"
  }
}
```

**Schedule Configuration:**
- **Cron Expression**: `0 0 * * * ?` (runs daily at midnight UTC)
- **Timezone**: UTC
- **Initial Status**: PAUSED (requires manual activation)

To activate the scheduled job, either:
1. Update the job in the Databricks UI
2. Run: `ALTER JOB calcom-booking-ingestion SET SCHEDULE UNPAUSED`

## Infrastructure Resources

The Terraform configuration creates the following resources:

| Resource Type | Resource Name | File | Purpose |
|---------------|---------------|------|---------|
| `databricks_secret_scope` | `calcom` | data_pipeline.tf | Secure credential storage |
| `databricks_secret` | `postgres_*` (5 secrets) | data_pipeline.tf | Individual credentials |
| `databricks_notebook` | `booking_ingestion` | data_pipeline.tf | PySpark ingestion logic |
| `databricks_job` | `booking_ingestion` | data_pipeline.tf | Scheduled execution |
| `databricks_catalog` | `calcom` | main.tf | Unity Catalog (optional) |
| `databricks_schema` | `booking_data` | main.tf | Schema container |
| `databricks_sql_endpoint` | `calcom_warehouse` | main.tf | SQL query engine (optional) |

## Configuration Variables

The pipeline accepts the following input variables:

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `databricks_host` | string | (required) | Databricks workspace URL |
| `databricks_token` | string | (required) | Personal access token (sensitive) |
| `catalog_name` | string | `"workspace"` | Unity Catalog name |
| `schema_name` | string | `"calcom_booking_data"` | Schema name |
| `create_catalog` | bool | `false` | Whether to create a new catalog |
| `warehouse_name` | string | `"calcom-warehouse"` | SQL Warehouse name |
| `warehouse_size` | string | `"2X-Small"` | SQL Warehouse size |
| `create_warehouse` | bool | `false` | Whether to create a new warehouse |
| `use_serverless_compute` | bool | `true` | Use serverless compute for jobs |
| `postgres_host` | string | (required) | PostgreSQL hostname |
| `postgres_port` | number | `5432` | PostgreSQL port |
| `postgres_database` | string | `"calcom"` | PostgreSQL database name |
| `postgres_user` | string | (required) | PostgreSQL username |
| `postgres_password` | string | (required) | PostgreSQL password (sensitive) |
| `environment` | string | `"dev"` | Environment name |
| `tags` | map(string) | `{project="calcom-lakehouse", managed_by="terraform"}` | Resource tags |

## Outputs

After deployment, Terraform provides the following outputs:

| Output | Description |
|--------|-------------|
| `sql_warehouse_id` | ID of the SQL Warehouse (if created) |
| `sql_warehouse_jdbc_url` | JDBC URL for BI tool connections (if warehouse created) |
| `catalog_name` | Name of the Unity Catalog |
| `schema_name` | Name of the schema |
| `booking_table_name` | Fully qualified table name (catalog.schema.booking) |
| `ingestion_job_id` | ID of the ingestion job |
| `ingestion_job_url` | URL to the job in Databricks UI |
| `notebook_path` | Path to the ingestion notebook |

## Booking Table Schema

The destination table contains the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `uid` | STRING | Unique booking identifier |
| `idempotency_key` | STRING | Idempotency key for deduplication |
| `user_id` | INT | Foreign key to User |
| `user_primary_email` | STRING | User's primary email |
| `event_type_id` | INT | Foreign key to EventType |
| `title` | STRING | Booking title |
| `description` | STRING | Booking description |
| `start_time` | TIMESTAMP | Booking start time |
| `end_time` | TIMESTAMP | Booking end time |
| `location` | STRING | Booking location |
| `status` | STRING | Status (CANCELLED, ACCEPTED, REJECTED, PENDING, AWAITING_HOST) |
| `paid` | BOOLEAN | Payment status |
| `cancellation_reason` | STRING | Reason for cancellation |
| `rejection_reason` | STRING | Reason for rejection |
| `reassign_reason` | STRING | Reason for reassignment |
| `reassign_by_id` | INT | User who reassigned |
| `rescheduled` | BOOLEAN | Whether booking was rescheduled |
| `from_reschedule` | STRING | Original booking reference |
| `recurring_event_id` | STRING | Recurring event identifier |
| `sms_reminder_number` | STRING | SMS reminder phone number |
| `is_recorded` | BOOLEAN | Whether meeting was recorded |
| `ical_uid` | STRING | iCal unique identifier |
| `ical_sequence` | INT | iCal sequence number |
| `rating` | INT | User rating |
| `rating_feedback` | STRING | Rating feedback text |
| `no_show_host` | BOOLEAN | Whether host was a no-show |
| `cancelled_by` | STRING | Who cancelled the booking |
| `rescheduled_by` | STRING | Who rescheduled the booking |
| `creation_source` | STRING | How the booking was created |
| `custom_inputs` | STRING | Custom form inputs (JSON) |
| `responses` | STRING | Booking responses (JSON) |
| `metadata` | STRING | Additional metadata (JSON) |
| `destination_calendar_id` | INT | Destination calendar ID |
| `dynamic_event_slug_ref` | STRING | Dynamic event slug reference |
| `dynamic_group_slug_ref` | STRING | Dynamic group slug reference |
| `one_time_password` | STRING | One-time password for booking |
| `created_at` | TIMESTAMP | Record creation timestamp |
| `updated_at` | TIMESTAMP | Record update timestamp |
| `_ingested_at` | TIMESTAMP | Ingestion timestamp (metadata) |
| `_source_system` | STRING | Source system identifier (metadata) |

## Deployment

To deploy the pipeline:

1. Copy the example variables file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your configuration values

3. Initialize Terraform:
   ```bash
   terraform init
   ```

4. Review the planned changes:
   ```bash
   terraform plan
   ```

5. Apply the configuration:
   ```bash
   terraform apply
   ```

6. Activate the job schedule (optional):
   ```sql
   ALTER JOB calcom-booking-ingestion SET SCHEDULE UNPAUSED
   ```

## Future Enhancements

This proof-of-concept implementation could be enhanced with:

- Additional tables (User, EventType, Attendee, etc.)
- Incremental data loading using Change Data Capture
- Data quality checks and monitoring
- dbt models for transformations
- Streaming ingestion using Kafka/Debezium
