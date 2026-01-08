mock_provider "databricks" {}

variables {
  databricks_host     = "https://test-workspace.cloud.databricks.com"
  databricks_token    = "test-token"
  postgres_host       = "test-postgres.example.com"
  postgres_user       = "test_user"
  postgres_password   = "test_password"
}

run "test_catalog_not_created_when_create_catalog_false" {
  command = plan

  variables {
    create_catalog = false
  }

  assert {
    condition     = length(databricks_catalog.calcom) == 0
    error_message = "Catalog should not be created when create_catalog is false"
  }
}

run "test_warehouse_not_created_when_create_warehouse_false" {
  command = plan

  variables {
    create_warehouse = false
  }

  assert {
    condition     = length(databricks_sql_endpoint.calcom_warehouse) == 0
    error_message = "Warehouse should not be created when create_warehouse is false"
  }
}

run "test_custom_environment_in_tags" {
  command = plan

  variables {
    environment = "production"
  }

  assert {
    condition     = var.environment == "production"
    error_message = "Environment variable should accept custom values"
  }
}

run "test_custom_postgres_port" {
  command = plan

  variables {
    postgres_port = 5433
  }

  assert {
    condition     = var.postgres_port == 5433
    error_message = "Postgres port should accept custom values"
  }
}
