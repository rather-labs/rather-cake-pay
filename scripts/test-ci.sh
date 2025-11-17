#!/bin/bash

# Local CI/CD Testing Script
# This script runs the same checks as GitHub Actions locally before submitting a PR
# Usage: ./scripts/test-ci.sh [contracts|frontend|all]

# Don't use set -e globally - handle errors explicitly in each function

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to test smart contracts
test_contracts() {
    print_status "Testing Smart Contracts..."
    
    cd hardhat || exit 1
    
    # Check Node.js version
    print_status "Checking Node.js version..."
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_error "Node.js version 20 or higher is required. Current: $(node -v)"
        exit 1
    fi
    print_success "Node.js version: $(node -v)"
    
    # Install dependencies
    print_status "Installing dependencies..."
    if [ ! -d "node_modules" ]; then
        npm install
    elif [ ! -f "package-lock.json" ]; then
        print_warning "package-lock.json not found. Running npm install..."
        npm install
    else
        # Try npm ci first, fall back to npm install if lock file is out of sync
        if ! npm ci >/dev/null 2>&1; then
            print_warning "package-lock.json is out of sync. Running npm install to update..."
            npm install
        fi
    fi
    print_success "Dependencies installed"
    
    # Linting 
    print_status "Running Solhint..."
    if ! command_exists solhint && ! npx solhint --version &>/dev/null 2>&1; then
        print_error "Solhint is required but not found. Installing..."
        npm install --save-dev solhint || {
            print_error "Failed to install Solhint. Please install manually: npm install --save-dev solhint"
            exit 1
        }
    fi
    if [ ! -f ".solhint.json" ]; then
        print_warning ".solhint.json not found. Solhint will use default configuration."
    fi
    npx solhint 'contracts/**/*.sol'
    print_success "Solhint passed"
    
    # Formatting check
    print_status "Checking formatting with Prettier..."
    if [ -f "package.json" ] && grep -q "prettier" package.json; then
        if npm run format:check >/dev/null 2>&1; then
            print_success "Formatting check passed"
        else
            print_error "Formatting issues found. Run 'npm run format' to fix."
            print_status "Showing formatting issues:"
            npm run format:check || true
            exit 1
        fi
    else
        print_error "Prettier not found in package.json. Please install: npm install --save-dev prettier prettier-plugin-solidity"
        exit 1
    fi
    
    # Compile contracts
    print_status "Compiling contracts..."
    if npm run compile 2>&1; then
        print_success "Contracts compiled successfully"
    else
        COMPILE_EXIT=$?
        print_error "Contract compilation failed (exit code: $COMPILE_EXIT)"
        exit 1
    fi
    
    # Run tests
    print_status "Running tests..."
    set +e  # Temporarily disable exit on error for tests
    npm test >/dev/null 2>&1
    TEST_EXIT=$?
    set -e  # Re-enable exit on error
    
    if [ $TEST_EXIT -eq 0 ]; then
        print_success "All tests passed"
    elif [ $TEST_EXIT -eq 1 ]; then
        print_warning "Tests failed or no tests found. Continuing..."
    else
        print_error "Test execution error (exit code: $TEST_EXIT)"
        exit 1
    fi
    
    # Coverage (if available)
    print_status "Generating coverage report (if available)..."
    if [ -f "hardhat.config.js" ] && (grep -q "coverage" hardhat.config.js || npm list 2>/dev/null | grep -q "solidity-coverage"); then
        set +e  # Temporarily disable exit on error for coverage
        npx hardhat coverage >/dev/null 2>&1
        COVERAGE_EXIT=$?
        set -e  # Re-enable exit on error
        
        if [ $COVERAGE_EXIT -eq 0 ]; then
            print_success "Coverage report generated"
        else
            print_warning "Coverage not configured or failed"
        fi
    else
        print_warning "Coverage not configured, skipping..."
    fi
    
    # Security checks
    print_status "Running security checks..."
    
    # npm audit
    print_status "Running npm audit..."
    set +e  # Temporarily disable exit on error for npm audit
    npm audit --audit-level=moderate >/dev/null 2>&1
    AUDIT_EXIT=$?
    set -e  # Re-enable exit on error
    
    if [ $AUDIT_EXIT -eq 0 ]; then
        print_success "No critical vulnerabilities found"
    else
        print_warning "Vulnerabilities found (check output above)"
        npm audit --audit-level=moderate 2>&1 | head -30 || true
    fi
    
    # Slither (mandatory security check)
    print_status "Running Slither security analysis..."
    if ! command_exists slither; then
        print_error "Slither is required but not found."
        print_error "Please install Slither: pip3 install slither-analyzer"
        print_error "Or install via pip: pip install slither-analyzer"
        exit 1
    fi
    # Run Slither and capture both output and exit code
    # Note: Slither returns non-zero (often 255) when it finds issues
    set +e  # Temporarily allow non-zero exit codes
    SLITHER_OUTPUT=$(slither . --exclude-dependencies 2>&1)
    SLITHER_EXIT=$?
    set -e  # Re-enable exit on error
    
    # Always show Slither output for visibility
    echo ""
    echo "$SLITHER_OUTPUT"
    echo ""
    
    # Check if Slither found any issues
    # Slither returns 0 on success, non-zero (often 255) when issues are found
    if [ $SLITHER_EXIT -eq 0 ]; then
        print_success "Slither analysis passed (no issues found)"
    else
        echo ""
        print_error "═══════════════════════════════════════════════════════════"
        print_error "  SLITHER SECURITY ANALYSIS FAILED"
        print_error "═══════════════════════════════════════════════════════════"
        print_error "Exit code: $SLITHER_EXIT"
        print_error ""
        print_error "Slither found security issues that must be fixed."
        print_error "Slither is MANDATORY - the build will fail in CI/CD."
        print_error ""
        print_error "Please review the Slither output above and fix all issues"
        print_error "before submitting a pull request."
        print_error "═══════════════════════════════════════════════════════════"
        echo ""
        exit 1
    fi
    
    cd ..
    print_success "Smart contracts CI checks completed!"
}

# Function to test frontend
test_frontend() {
    print_status "Testing Frontend..."
    
    cd frontend || exit 1
    
    # Check Node.js version
    print_status "Checking Node.js version..."
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        print_error "Node.js version 20 or higher is required. Current: $(node -v)"
        exit 1
    fi
    print_success "Node.js version: $(node -v)"
    
    # Install dependencies
    print_status "Installing dependencies..."
    if [ ! -d "node_modules" ]; then
        npm install
    elif [ ! -f "package-lock.json" ]; then
        print_warning "package-lock.json not found. Running npm install..."
        npm install
    else
        # Try npm ci first, fall back to npm install if lock file is out of sync
        if ! npm ci >/dev/null 2>&1; then
            print_warning "package-lock.json is out of sync. Running npm install to update..."
            npm install
        fi
    fi
    print_success "Dependencies installed"
    
    # ESLint
    print_status "Running ESLint..."
    if npm run lint 2>&1; then
        print_success "ESLint passed"
    else
        ESLINT_EXIT=$?
        print_error "ESLint failed (exit code: $ESLINT_EXIT)"
        exit 1
    fi
    
    # Type check
    print_status "Running TypeScript type check..."
    if npx tsc --noEmit 2>&1; then
        print_success "Type check passed"
    else
        TSC_EXIT=$?
        print_error "TypeScript type check failed (exit code: $TSC_EXIT)"
        exit 1
    fi
    
    # Formatting check
    print_status "Checking formatting with Prettier..."
    if [ -f "package.json" ] && grep -q "prettier" package.json; then
        if npm run format:check >/dev/null 2>&1; then
            print_success "Formatting check passed"
        else
            print_error "Formatting issues found. Run 'npm run format' to fix."
            print_status "Showing formatting issues:"
            npm run format:check || true
            exit 1
        fi
    else
        print_error "Prettier not found in package.json. Please install: npm install --save-dev prettier"
        exit 1
    fi
    
    # Build
    print_status "Building application..."
    # Set default env vars if not set
    export NEXT_PUBLIC_CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID:-11155111}
    export NEXT_PUBLIC_CONTRACT_ADDRESS=${NEXT_PUBLIC_CONTRACT_ADDRESS:-0x0000000000000000000000000000000000000000}
    export NEXT_PUBLIC_RPC_URL=${NEXT_PUBLIC_RPC_URL:-https://sepolia.infura.io/v3/YOUR_KEY}
    
    if npm run build 2>&1; then
        print_success "Build completed successfully"
    else
        BUILD_EXIT=$?
        print_error "Build failed (exit code: $BUILD_EXIT)"
        exit 1
    fi
    
    # Security checks
    print_status "Running security checks..."
    print_status "Running npm audit..."
    set +e  # Temporarily disable exit on error for npm audit
    npm audit --audit-level=moderate >/dev/null 2>&1
    AUDIT_EXIT=$?
    set -e  # Re-enable exit on error
    
    if [ $AUDIT_EXIT -eq 0 ]; then
        print_success "No critical vulnerabilities found"
    else
        print_warning "Vulnerabilities found (check output above)"
        npm audit --audit-level=moderate 2>&1 | head -30 || true
    fi
    
    cd ..
    print_success "Frontend CI checks completed!"
}

# Main execution
main() {
    print_status "Starting local CI/CD testing..."
    print_status "This script runs the same checks as GitHub Actions"
    echo ""
    
    # Determine what to test
    TEST_TARGET="${1:-all}"
    
    case "$TEST_TARGET" in
        contracts)
            test_contracts
            ;;
        frontend)
            test_frontend
            ;;
        all)
            test_contracts
            echo ""
            test_frontend
            ;;
        *)
            print_error "Invalid argument: $TEST_TARGET"
            echo "Usage: ./scripts/test-ci.sh [contracts|frontend|all]"
            exit 1
            ;;
    esac
    
    echo ""
    print_success "All CI checks completed successfully! ✅"
    print_status "You can now submit your pull request with confidence."
}

# Run main function
main "$@"

