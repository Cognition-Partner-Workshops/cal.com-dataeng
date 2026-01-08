mock_provider "databricks" {}

variables {
  databricks_host     = "https://test-workspace.cloud.databricks.com"
  databricks_token    = "test-token"
  postgres_host       = "test-postgres.example.com"
  postgres_user       = "test_user"
  postgres_password   = "test_password"
  catalog_name        = "test_catalog"
  schema_name         = "test_schema"
}

run "test_booking_table_name_format" {
  command = plan

  assert {
    condition     = output.booking_table_name == "test_catalog.test_schema.booking"
    error_message = "Booking table name should be formatted as 'catalog.schema.booking'"
  }
}

run "test_catalog_name_output" {
  command = plan

  assert {
    condition     = output.catalog_name == "test_catalog"
    error_message = "Catalog name output should match the input variable"
  }
}

run "test_warehouse_not_created_by_default" {
  command = plan

  assert {
    condition     = output.sql_warehouse_id == null
    error_message = "SQL warehouse ID should be null when create_warehouse is false"
  }

  assert {
    condition     = output.sql_warehouse_jdbc_url == null
    error_message = "SQL warehouse JDBC URL should be null when create_warehouse is false"
  }
}
