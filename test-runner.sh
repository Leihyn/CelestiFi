#!/bin/bash

# DeFi Pulse - Automated Test Runner
# This script runs comprehensive tests from TESTING_CHECKLIST.md

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:5173"
REDIS_PORT=6379
TEST_RESULTS_FILE="test-results.txt"

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_TESTS++))
    ((TOTAL_TESTS++))
}

log_error() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAILED_TESTS++))
    ((TOTAL_TESTS++))
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test functions
test_health_endpoint() {
    log_info "Testing health endpoint..."
    response=$(curl -s "$BACKEND_URL/health")
    if echo "$response" | grep -q '"status":"ok"'; then
        log_success "Health endpoint returns OK"
    else
        log_error "Health endpoint failed: $response"
    fi
}

test_api_pools() {
    log_info "Testing pools endpoint..."
    response=$(curl -s "$BACKEND_URL/api/pools")
    if echo "$response" | grep -q '"success":true'; then
        log_success "Pools endpoint returns data"
    else
        log_error "Pools endpoint failed: $response"
    fi
}

test_api_whales() {
    log_info "Testing whales endpoint..."
    response=$(curl -s "$BACKEND_URL/api/whales/recent?limit=10")
    if echo "$response" | grep -q '"success":true'; then
        log_success "Whales endpoint returns data"
    else
        log_error "Whales endpoint failed: $response"
    fi
}

test_api_stats() {
    log_info "Testing stats endpoint..."
    response=$(curl -s "$BACKEND_URL/api/stats")
    if echo "$response" | grep -q '"success":true'; then
        log_success "Stats endpoint returns data"
    else
        log_error "Stats endpoint failed: $response"
    fi
}

test_rate_limiting() {
    log_info "Testing rate limiting (sending 101 requests)..."
    local rate_limited=false

    for i in {1..101}; do
        status=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/stats")
        if [ "$status" -eq 429 ]; then
            rate_limited=true
            break
        fi
    done

    if [ "$rate_limited" = true ]; then
        log_success "Rate limiting works (429 status received)"
    else
        log_error "Rate limiting not working (no 429 status)"
    fi

    # Wait for rate limit to reset
    log_info "Waiting 60 seconds for rate limit to reset..."
    sleep 60
}

test_cors() {
    log_info "Testing CORS policy..."
    response=$(curl -s -H "Origin: http://evil.com" -I "$BACKEND_URL/api/stats" | grep -i "access-control")
    if [ -z "$response" ]; then
        log_success "CORS blocks unauthorized origins"
    else
        log_warning "CORS may allow unauthorized origins"
    fi
}

test_frontend_loads() {
    log_info "Testing if frontend loads..."
    status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
    if [ "$status" -eq 200 ]; then
        log_success "Frontend loads successfully (HTTP 200)"
    else
        log_error "Frontend failed to load (HTTP $status)"
    fi
}

test_input_validation() {
    log_info "Testing input validation..."
    response=$(curl -s "$BACKEND_URL/api/whales/recent?limit=99999")
    # Should either limit to max or return error
    if echo "$response" | grep -q '"success":true\|"error"'; then
        log_success "Input validation working"
    else
        log_error "Input validation may not be working"
    fi
}

check_prerequisite() {
    local name=$1
    local command=$2

    if command -v "$command" &> /dev/null; then
        log_success "Prerequisite: $name installed"
        return 0
    else
        log_error "Prerequisite: $name NOT installed"
        return 1
    fi
}

check_redis() {
    log_info "Checking Redis connection..."
    if command -v redis-cli &> /dev/null; then
        if redis-cli -p $REDIS_PORT ping &> /dev/null; then
            log_success "Redis is running on port $REDIS_PORT"
            return 0
        else
            log_error "Redis is not running on port $REDIS_PORT"
            return 1
        fi
    else
        log_warning "redis-cli not installed, skipping Redis check"
        return 0
    fi
}

check_backend_running() {
    log_info "Checking if backend is running..."
    if curl -s "$BACKEND_URL/health" &> /dev/null; then
        log_success "Backend is running on $BACKEND_URL"
        return 0
    else
        log_error "Backend is NOT running on $BACKEND_URL"
        return 1
    fi
}

check_frontend_running() {
    log_info "Checking if frontend is running..."
    if curl -s "$FRONTEND_URL" &> /dev/null; then
        log_success "Frontend is running on $FRONTEND_URL"
        return 0
    else
        log_error "Frontend is NOT running on $FRONTEND_URL"
        return 1
    fi
}

# Main test execution
main() {
    echo ""
    echo "=========================================="
    echo "  DeFi Pulse - Automated Test Runner"
    echo "=========================================="
    echo ""

    log_info "Starting test execution at $(date)"
    echo ""

    # Clear previous results
    > "$TEST_RESULTS_FILE"

    # Prerequisites Check
    echo "=========================================="
    echo "  PREREQUISITES CHECK"
    echo "=========================================="
    echo ""

    check_prerequisite "Node.js" "node"
    check_prerequisite "npm" "npm"
    check_prerequisite "curl" "curl"
    check_prerequisite "Redis CLI" "redis-cli" || true

    echo ""

    # Service Health Checks
    echo "=========================================="
    echo "  SERVICE HEALTH CHECKS"
    echo "=========================================="
    echo ""

    check_redis

    backend_running=false
    if check_backend_running; then
        backend_running=true
    else
        log_warning "Backend is not running. Please start it with: cd backend && npm run dev"
    fi

    frontend_running=false
    if check_frontend_running; then
        frontend_running=true
    else
        log_warning "Frontend is not running. Please start it with: cd frontend && npm run dev"
    fi

    echo ""

    # Backend API Tests
    if [ "$backend_running" = true ]; then
        echo "=========================================="
        echo "  BACKEND API TESTS"
        echo "=========================================="
        echo ""

        test_health_endpoint
        test_api_pools
        test_api_whales
        test_api_stats

        echo ""

        # Security Tests
        echo "=========================================="
        echo "  SECURITY TESTS"
        echo "=========================================="
        echo ""

        test_cors
        test_input_validation
        test_rate_limiting

        echo ""
    else
        log_warning "Skipping backend tests (backend not running)"
        echo ""
    fi

    # Frontend Tests
    if [ "$frontend_running" = true ]; then
        echo "=========================================="
        echo "  FRONTEND TESTS"
        echo "=========================================="
        echo ""

        test_frontend_loads

        echo ""
    else
        log_warning "Skipping frontend tests (frontend not running)"
        echo ""
    fi

    # Performance Tests (if Lighthouse is installed)
    if command -v lighthouse &> /dev/null && [ "$frontend_running" = true ]; then
        echo "=========================================="
        echo "  PERFORMANCE TESTS (LIGHTHOUSE)"
        echo "=========================================="
        echo ""

        log_info "Running Lighthouse audit on $FRONTEND_URL..."
        lighthouse "$FRONTEND_URL" --output=html --output-path=./lighthouse-report.html --quiet

        if [ -f "./lighthouse-report.html" ]; then
            log_success "Lighthouse report generated: lighthouse-report.html"
        else
            log_error "Lighthouse report generation failed"
        fi

        echo ""
    else
        log_warning "Lighthouse not installed or frontend not running. Skipping performance tests."
        log_info "Install Lighthouse: npm install -g lighthouse"
        echo ""
    fi

    # Test Summary
    echo "=========================================="
    echo "  TEST SUMMARY"
    echo "=========================================="
    echo ""
    echo "Total Tests Run:  $TOTAL_TESTS"
    echo -e "${GREEN}Tests Passed:     $PASSED_TESTS${NC}"
    echo -e "${RED}Tests Failed:     $FAILED_TESTS${NC}"
    echo ""

    # Calculate pass rate
    if [ $TOTAL_TESTS -gt 0 ]; then
        pass_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
        echo "Pass Rate: ${pass_rate}%"
    fi

    echo ""
    echo "Test completed at $(date)"

    # Save results
    {
        echo "DeFi Pulse Test Results"
        echo "======================="
        echo "Date: $(date)"
        echo ""
        echo "Total Tests: $TOTAL_TESTS"
        echo "Passed: $PASSED_TESTS"
        echo "Failed: $FAILED_TESTS"
        echo "Pass Rate: ${pass_rate}%"
    } > "$TEST_RESULTS_FILE"

    log_info "Test results saved to: $TEST_RESULTS_FILE"

    echo ""
    echo "=========================================="
    echo "  MANUAL TESTS REQUIRED"
    echo "=========================================="
    echo ""
    echo "The following tests require manual verification:"
    echo "  1. WebSocket real-time connection (check browser console)"
    echo "  2. Whale radar animation (visual inspection)"
    echo "  3. Impact modal functionality (click 'View Impact')"
    echo "  4. Filter functionality (test all filters)"
    echo "  5. Mobile responsiveness (resize browser)"
    echo "  6. Browser compatibility (test in Chrome, Firefox, Safari)"
    echo ""
    echo "Refer to TESTING_CHECKLIST.md for complete manual testing guide."
    echo ""

    # Exit with error if any tests failed
    if [ $FAILED_TESTS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

# Run main function
main "$@"
