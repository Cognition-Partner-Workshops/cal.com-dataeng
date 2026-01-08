mock_provider "databricks" {}

variables {
  databricks_host     = "https://test-workspace.cloud.databricks.com"
  databricks_token    = "test-token"
  postgres_host       = "test-postgres.example.com"
  postgres_user       = "test_user"
  postgres_password   = "test_password"
}

run "test_default_catalog_name" {
  command = plan

  assert {
    condition     = var.catalog_name == "workspace"
    error_message = "Default catalog_name should be 'workspace'"
  }
}

run "test_default_schema_name" {
  command = plan

  assert {
    condition     = var.schema_name == "calcom_booking_data"
    error_message = "Default schema_name should be 'calcom_booking_data'"
  }
}

run "test_default_warehouse_name" {
  command = plan

  assert {
    condition     = var.warehouse_name == "calcom-warehouse"
    error_message = "Default warehouse_name should be 'calcom-warehouse'"
  }
}

run "test_default_warehouse_size" {
  command = plan

  assert {
    condition     = var.warehouse_size == "2X-Small"
    error_message = "Default warehouse_size should be '2X-Small'"
  }
}

run "test_default_postgres_port" {
  command = plan

  assert {
    condition     = var.postgres_port == 5432
    error_message = "Default postgres_port should be 5432"
  }
}

run "test_default_postgres_database" {
  command = plan

  assert {
    condition     = var.postgres_database == "calcom"
    error_message = "Default postgres_database should be 'calcom'"
  }
}

run "test_default_environment" {
  command = plan

  assert {
    condition     = var.environment == "dev"
    error_message = "Default environment should be 'dev'"
  }
}

run "test_default_create_catalog_false" {
  command = plan

  assert {
    condition     = var.create_catalog == false
    error_message = "Default create_catalog should be false"
  }
}

run "test_default_create_warehouse_false" {
  command = plan

  assert {
    condition     = var.create_warehouse == false
    error_message = "Default create_warehouse should be false"
  }
}

run "test_default_use_serverless_compute_true" {
  command = plan

  assert {
    condition     = var.use_serverless_compute == true
    error_message = "Default use_serverless_compute should be true"
  }
}

run "test_default_tags" {
  command = plan

  assert {
    condition     = var.tags["project"] == "calcom-lakehouse"
    error_message = "Default tags should include project = 'calcom-lakehouse'"
  }

  assert {
    condition     = var.tags["managed_by"] == "terraform"
    error_message = "Default tags should include managed_by = 'terraform'"
  }
}
