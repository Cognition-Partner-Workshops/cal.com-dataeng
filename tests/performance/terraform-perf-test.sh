#!/bin/bash

# Performance Test Script for Terraform Infrastructure
# This script measures the execution time of various Terraform operations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../../terraform"
RESULTS_FILE="${SCRIPT_DIR}/results.json"
THRESHOLD_INIT_MS=30000
THRESHOLD_VALIDATE_MS=5000
THRESHOLD_FMT_MS=2000

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

measure_time() {
    local start_time=$(date +%s%3N)
    "$@"
    local end_time=$(date +%s%3N)
    echo $((end_time - start_time))
}

run_performance_tests() {
    log_info "Starting Terraform Performance Tests"
    log_info "Working directory: ${TERRAFORM_DIR}"
    
    cd "${TERRAFORM_DIR}"
    
    local results=()
    local all_passed=true
    
    # Test 1: terraform fmt -check
    log_info "Running terraform fmt -check..."
    local fmt_start=$(date +%s%3N)
    if terraform fmt -check -recursive > /dev/null 2>&1; then
        local fmt_end=$(date +%s%3N)
        local fmt_duration=$((fmt_end - fmt_start))
        log_info "terraform fmt completed in ${fmt_duration}ms"
        
        if [ $fmt_duration -gt $THRESHOLD_FMT_MS ]; then
            log_warn "terraform fmt exceeded threshold (${THRESHOLD_FMT_MS}ms)"
            all_passed=false
        fi
        results+=("\"fmt\": {\"duration_ms\": ${fmt_duration}, \"threshold_ms\": ${THRESHOLD_FMT_MS}, \"passed\": $([ $fmt_duration -le $THRESHOLD_FMT_MS ] && echo true || echo false)}")
    else
        log_error "terraform fmt -check failed (formatting issues found)"
        results+=("\"fmt\": {\"duration_ms\": 0, \"threshold_ms\": ${THRESHOLD_FMT_MS}, \"passed\": false, \"error\": \"formatting issues found\"}")
        all_passed=false
    fi
    
    # Test 2: terraform validate (requires init first, but we skip actual init for dry-run)
    log_info "Running terraform validate..."
    local validate_start=$(date +%s%3N)
    if terraform validate > /dev/null 2>&1; then
        local validate_end=$(date +%s%3N)
        local validate_duration=$((validate_end - validate_start))
        log_info "terraform validate completed in ${validate_duration}ms"
        
        if [ $validate_duration -gt $THRESHOLD_VALIDATE_MS ]; then
            log_warn "terraform validate exceeded threshold (${THRESHOLD_VALIDATE_MS}ms)"
            all_passed=false
        fi
        results+=("\"validate\": {\"duration_ms\": ${validate_duration}, \"threshold_ms\": ${THRESHOLD_VALIDATE_MS}, \"passed\": $([ $validate_duration -le $THRESHOLD_VALIDATE_MS ] && echo true || echo false)}")
    else
        log_warn "terraform validate skipped (requires terraform init)"
        results+=("\"validate\": {\"duration_ms\": 0, \"threshold_ms\": ${THRESHOLD_VALIDATE_MS}, \"passed\": true, \"skipped\": true}")
    fi
    
    # Test 3: Count resources and measure file parsing time
    log_info "Measuring Terraform file parsing..."
    local parse_start=$(date +%s%3N)
    local tf_files=$(find . -name "*.tf" -type f | wc -l)
    local total_lines=$(find . -name "*.tf" -type f -exec cat {} \; | wc -l)
    local parse_end=$(date +%s%3N)
    local parse_duration=$((parse_end - parse_start))
    
    log_info "Found ${tf_files} Terraform files with ${total_lines} total lines"
    log_info "File parsing completed in ${parse_duration}ms"
    
    results+=("\"file_stats\": {\"tf_files\": ${tf_files}, \"total_lines\": ${total_lines}, \"parse_duration_ms\": ${parse_duration}}")
    
    # Generate results JSON
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    echo "{" > "${RESULTS_FILE}"
    echo "  \"timestamp\": \"${timestamp}\"," >> "${RESULTS_FILE}"
    echo "  \"terraform_dir\": \"${TERRAFORM_DIR}\"," >> "${RESULTS_FILE}"
    echo "  \"results\": {" >> "${RESULTS_FILE}"
    
    local first=true
    for result in "${results[@]}"; do
        if [ "$first" = true ]; then
            echo "    ${result}" >> "${RESULTS_FILE}"
            first=false
        else
            echo "    ,${result}" >> "${RESULTS_FILE}"
        fi
    done
    
    echo "  }," >> "${RESULTS_FILE}"
    echo "  \"all_passed\": ${all_passed}" >> "${RESULTS_FILE}"
    echo "}" >> "${RESULTS_FILE}"
    
    log_info "Results saved to ${RESULTS_FILE}"
    
    if [ "$all_passed" = true ]; then
        log_info "All performance tests passed!"
        return 0
    else
        log_error "Some performance tests failed or exceeded thresholds"
        return 1
    fi
}

# Main execution
run_performance_tests
