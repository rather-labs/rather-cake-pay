# Contributing to Rather Cake Pay

This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Branching Strategy](#branching-strategy)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Security Considerations](#security-considerations)
- [Smart Contract Development](#smart-contract-development)
- [Frontend Development](#frontend-development)

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Git
- A code editor
- MetaMask or compatible wallet (for testing)
- **Solhint** (required for smart contract linting)
- **Slither** (required for smart contract security analysis)
- Python 3.x (required for Slither)

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/rather-cake-pay.git
   cd rather-cake-pay
   ```

3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/rather-cake-pay.git
   ```

4. **Install dependencies:**
   ```bash
   # Install smart contract dependencies
   cd hardhat
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

5. **Install required tools:**
   ```bash
   # Install Solhint (required)
   cd hardhat
   npm install --save-dev solhint
   
   # Install Slither (required)
   pip3 install slither-analyzer
   ```

6. **Set up environment variables:**
   - Copy `.env.example` files if they exist
   - Configure necessary API keys and network settings
   - **Never commit secrets or private keys**

## Development Workflow

### Branching Strategy

We use a **Git Flow-inspired** branching strategy optimized for blockchain development:

```
main          → Production-ready code (protected)
├── develop   → Integration branch for features
├── feature/* → New features
├── fix/*     → Bug fixes
├── hotfix/*  → Urgent production fixes
└── release/* → Release preparation
```

#### Branch Types

**`main`** (Protected)
- Production-ready code
- Only updated via pull requests from `develop` or `hotfix/*`
- Requires code review and passing CI/CD
- Automatically deploys to mainnet (with approval)

**`develop`** (Integration)
- Integration branch for completed features
- Automatically deploys to testnet
- Should always be in a deployable state
- Merge target for `feature/*` and `fix/*` branches

**`feature/*`** (Feature Development)
- Naming: `feature/description` (e.g., `feature/add-receipt-upload`)
- Created from `develop`
- Merged back to `develop` when complete
- One feature per branch

**`fix/*`** (Bug Fixes)
- Naming: `fix/description` (e.g., `fix/balance-calculation`)
- Created from `develop`
- Merged back to `develop` when complete
- For non-urgent bug fixes

**`hotfix/*`** (Urgent Fixes)
- Naming: `hotfix/description` (e.g., `hotfix/security-patch`)
- Created from `main`
- Merged to both `main` and `develop`
- For critical production issues

**`release/*`** (Release Preparation)
- Naming: `release/v1.0.0`
- Created from `develop`
- For final testing and version bumping
- Merged to `main` and `develop`

### Creating a New Branch

```bash
# Update your local develop branch
git checkout develop
git pull upstream develop

# Create and switch to a new feature branch
git checkout -b feature/your-feature-name

# Or for a bug fix
git checkout -b fix/your-fix-name
```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `security`: Security fixes

### Scopes

- `contracts`: Smart contract changes
- `frontend`: Frontend changes
- `api`: API route changes
- `db`: Database changes
- `config`: Configuration changes

### Examples

```bash
# Good commit messages
feat(contracts): add batch ingredient submission
fix(frontend): resolve wallet connection issue
docs: update API documentation
refactor(contracts): optimize gas usage in cutCake

# Bad commit messages
fix: bug fix
update code
WIP
```

### Commit Best Practices

1. **Keep commits atomic**: One logical change per commit
2. **Write clear messages**: Explain what and why, not how
3. **Reference issues**: Use `Closes #123` or `Fixes #456` in footer
4. **Test before committing**: Ensure code compiles and tests pass

## Pull Request Process

### Before Submitting

1. **Update your branch:**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout your-branch
   git rebase develop
   ```

2. **Run tests locally:**
   
   **Option 1: Use the CI test script (Recommended)**
   ```bash
   # Test everything (contracts + frontend)
   ./scripts/test-ci.sh
   
   # Or test specific components
   ./scripts/test-ci.sh contracts
   ./scripts/test-ci.sh frontend
   ```
   
   **Option 2: Manual testing**
   ```bash
   # Smart contracts
   cd hardhat
   npm test
   npm run lint
   
   # Frontend
   cd ../frontend
   npm test
   npm run lint
   npm run build
   ```

3. **Ensure CI passes**: All checks must be green

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if needed)
- [ ] Tests added/updated and passing
- [ ] No console.logs or debug code
- [ ] No secrets or sensitive data
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with develop

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Closes #123

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Smart Contract Changes
- [ ] Gas optimization considered
- [ ] Security review completed
- [ ] Events properly emitted

## Screenshots (if applicable)
```

### Review Process

1. **Automated Checks**: CI/CD runs automatically
   - Linting
   - Type checking
   - Tests
   - Security scanning
   - Build verification

2. **Code Review**: At least one maintainer approval required
   - Focus on security for smart contract changes
   - Check for gas optimization opportunities
   - Verify test coverage

3. **Addressing Feedback**: Update PR based on review comments
   ```bash
   # Make changes
   git add .
   git commit -m "fix: address review feedback"
   git push
   ```

4. **Merge**: Once approved, maintainers will merge
   - Use "Squash and merge" for feature branches
   - Use "Merge commit" for hotfixes
   - Delete branch after merge


## Testing Requirements

### Smart Contracts

**Required:**
- Unit tests for all public functions
- Edge case testing
- Gas usage reporting
- Reentrancy tests (if applicable)

**Test Structure:**
```javascript
describe("CakeFactory", () => {
  describe("createCake", () => {
    it("should create a new cake", async () => {
      // Test implementation
    });
    
    it("should revert if invalid parameters", async () => {
      // Test implementation
    });
  });
});
```

### Frontend

**Required:**
- Component tests for UI components
- Integration tests for API routes
- Contract interaction mocks
- Error handling tests

## Security Considerations

### Critical Rules

1. **Never commit:**
   - Private keys
   - Mnemonic phrases
   - API keys
   - Passwords
   - `.env` files with secrets

2. **Smart Contract Security:**
   - All contract changes require security review
   - Use established patterns (OpenZeppelin)
   - Test for common vulnerabilities
   - Consider gas optimization
   - Document security assumptions

3. **Frontend Security:**
   - Validate all user inputs
   - Sanitize data before rendering
   - Use HTTPS in production
   - Implement rate limiting
   - Follow OWASP guidelines

### Security Review Process

For smart contract changes:
1. Automated security scanning (Slither, Mythril)
2. Manual code review by security-focused reviewer
3. Test coverage verification
4. Gas optimization review

## Smart Contract Development

### Development Setup

```bash
cd hardhat
npm install
npm run compile
npm run test
```

### Local Testing

```bash
# Start local Hardhat node
npm run node

# In another terminal, deploy locally
npm run deploy:local
```

### Adding New Contracts

1. Create contract in `hardhat/contracts/`
2. Write tests in `hardhat/test/`
3. Update deployment script if needed
4. Update documentation

### Gas Optimization

- Use `uint256` for calculations, smaller types for storage
- Pack structs efficiently
- Use events instead of storage when possible
- Cache storage variables
- Use `external` for functions only called externally

## Frontend Development

### Development Setup

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables

Create `.env.local` (never commit):
```env
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://...
```

### Adding New Features

1. Create feature branch
2. Implement feature
3. Add tests
4. Update documentation
5. Test with testnet contracts
6. Submit PR

### API Routes

- Validate all inputs
- Handle errors gracefully
- Return consistent response formats
- Add rate limiting for public endpoints
- Document endpoints

## Getting Help

- **Documentation**: Check README.md and other docs
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **Security**: Report security issues privately to maintainers

