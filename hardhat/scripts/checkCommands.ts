import { Commands } from "@uniswap/universal-router/contracts/libraries/Commands.sol";

async function main() {
  console.log("Commands.V4_SWAP:", Commands.V4_SWAP);
  // Check if other commands exist in the enum/library
  console.log("Commands object keys:", Object.keys(Commands));
}

main().catch(console.error);

