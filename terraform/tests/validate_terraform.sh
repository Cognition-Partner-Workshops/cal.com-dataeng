#!/bin/bash

echo "=== Cal.com Data Engineering Terraform Validation Tests ==="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="$(dirname "$SCRIPT_DIR")"

PASSED=0
FAILED=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testing: $test_name... "
    if eval "$test_command" > /dev/null 2>&1; then
        echo "PASSED"
        PASSED=$((PASSED + 1))
    else
        echo "FAILED"
        FAILED=$((FAILED + 1))
    fi
}

cd "$TERRAFORM_DIR"

echo "=== File Structure Tests ==="
run_test "main.tf exists" "test -f main.tf"
run_test "variables.tf exists" "test -f variables.tf"
run_test "outputs.tf exists" "test -f outputs.tf"
run_test "providers.tf exists" "test -f providers.tf"
run_test "versions.tf exists" "test -f versions.tf"
run_test "data_pipeline.tf exists" "test -f data_pipeline.tf"
run_test "booking_table.tf exists" "test -f booking_table.tf"
run_test ".terraform.lock.hcl exists" "test -f .terraform.lock.hcl"
run_test "terraform.tfvars.example exists" "test -f terraform.tfvars.example"

echo ""
echo "=== Terraform Format Tests ==="
run_test "terraform fmt check" "terraform fmt -check -recursive"

echo ""
echo "=== File Content Tests ==="
run_test "main.tf has resource declarations" "grep -q 'resource' main.tf"
run_test "variables.tf has variable declarations" "grep -q 'variable' variables.tf"
run_test "outputs.tf has output declarations" "grep -q 'output' outputs.tf"
run_test "providers.tf has provider configuration" "grep -q 'provider' providers.tf"
run_test "versions.tf has terraform version constraint" "grep -q 'terraform' versions.tf"
run_test "data_pipeline.tf has databricks resources" "grep -q 'databricks' data_pipeline.tf"

echo ""
echo "=== Variable Definition Tests ==="
run_test "databricks_host variable defined" "grep -q 'databricks_host' variables.tf"
run_test "databricks_token variable defined" "grep -q 'databricks_token' variables.tf"
run_test "catalog_name variable defined" "grep -q 'catalog_name' variables.tf"
run_test "schema_name variable defined" "grep -q 'schema_name' variables.tf"
run_test "postgres_host variable defined" "grep -q 'postgres_host' variables.tf"
run_test "postgres_password variable defined" "grep -q 'postgres_password' variables.tf"

echo ""
echo "=== Output Definition Tests ==="
run_test "sql_warehouse_jdbc_url output defined" "grep -q 'sql_warehouse_jdbc_url' outputs.tf"
run_test "booking_table_name output defined" "grep -q 'booking_table_name' outputs.tf"

echo ""
echo "=== Provider Configuration Tests ==="
run_test "databricks provider configured" "grep -q 'databricks' providers.tf"

echo ""
echo "=== Summary ==="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "Some tests failed!"
    exit 1
else
    echo "All tests passed!"
    exit 0
fi
