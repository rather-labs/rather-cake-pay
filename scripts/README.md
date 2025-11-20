# Scripts Directory

This directory contains utility scripts for local development and testing.

## test-ci.sh

Runs the same CI/CD checks locally that GitHub Actions runs, allowing you to catch issues before submitting a pull request.

### Usage

```bash
# Test everything (contracts + frontend)
./scripts/test-ci.sh

# Test only smart contracts
./scripts/test-ci.sh contracts

# Test only frontend
./scripts/test-ci.sh frontend
```

### What it checks

**Smart Contracts:**
- Node.js version (requires 20+)
- Dependency installation
- Solidity linting (Solhint)
- Code formatting (Prettier, if available)
- Contract compilation
- Test execution
- Coverage report generation (if configured)
- Security scanning (Slither)

**Frontend:**
- Node.js version (requires 20+)
- Dependency installation
- ESLint validation
- TypeScript type checking
- Next.js build
- Security scanning (npm audit)

### Prerequisites

- Node.js 20.x or higher
- npm
- **Solhint** for Solidity linting (**required**)
- **Slither** for security analysis (**required**)
- (Optional) Prettier for code formatting

### Installing Required Tools

**Solhint:**
```bash
# Install as dev dependency (recommended)
cd hardhat
npm install --save-dev solhint

# Or install globally
npm install -g solhint
```

**Slither:**
```bash
# Install via pip
pip3 install slither-analyzer

# Or via pip
pip install slither-analyzer
```

**Prettier:**
```bash
npm install -g prettier
# Or add to project dependencies
```

### Exit Codes

- `0`: All checks passed
- `1`: One or more checks failed

### Environment Variables

For frontend testing, you can set these environment variables:

```bash
export NEXT_PUBLIC_CHAIN_ID=11155111
export NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
export NEXT_PUBLIC_RPC_URL=https://...
```

If not set, default test values will be used.

### Integration with Git Hooks

You can add this script to a pre-commit hook:

```bash
# .git/hooks/pre-commit
#!/bin/bash
./scripts/test-ci.sh
```

Or use it in a pre-push hook:

```bash
# .git/hooks/pre-push
#!/bin/bash
./scripts/test-ci.sh
```

### Troubleshooting

**"Command not found" errors:**
- Make sure the script is executable: `chmod +x scripts/test-ci.sh`
- Ensure you're running from the project root

**"Node.js version" errors:**
- Install Node.js 20.x or higher
- Use `nvm` to manage Node.js versions: `nvm install 20 && nvm use 20`

**"Solhint/Slither not found" errors:**
- These are **required** tools
- The script will fail if they are not installed
- Install Solhint: `cd hardhat && npm install --save-dev solhint`
- Install Slither: `pip3 install slither-analyzer`

**Build failures:**
- Check that all dependencies are installed
- Ensure environment variables are set correctly
- Review error messages for specific issues

