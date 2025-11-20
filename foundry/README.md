## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

## Setting Up Dependencies

To compile and run the project, you need to install the required libraries. Use the following commands to clone the necessary dependencies:

```shell
# Clone Uniswap and OpenZeppelin libraries
$ git clone --recurse-submodules https://github.com/Uniswap/universal-router lib/universal-router
$ git clone --recurse-submodules https://github.com/Uniswap/v4-core lib/v4-core
$ git clone --recurse-submodules https://github.com/Uniswap/v4-periphery lib/v4-periphery
$ git clone --recurse-submodules https://github.com/Uniswap/permit2 lib/permit2
$ git clone --recurse-submodules https://github.com/OpenZeppelin/openzeppelin-contracts lib/openzeppelin-contracts
$ git clone --recurse-submodules https://github.com/Uniswap/v2-core lib/v2-core
$ git clone --recurse-submodules https://github.com/Uniswap/v3-core lib/v3-core

# Clean and build the project
$ forge clean
$ forge build
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
