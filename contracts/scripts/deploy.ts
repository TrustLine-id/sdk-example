import { ethers } from "hardhat";

async function main() {
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // TODO: Replace these with actual Trustline Validation Engine addresses
  // These addresses should be provided based on your network
  const TRUSTLINE_VALIDATION_ENGINE_LOGIC = process.env.TRUSTLINE_VALIDATION_ENGINE_LOGIC || "0x0000000000000000000000000000000000000000";
  const TRUSTLINE_VALIDATION_ENGINE_PROXY = process.env.TRUSTLINE_VALIDATION_ENGINE_PROXY || "0x0000000000000000000000000000000000000000";

  if (TRUSTLINE_VALIDATION_ENGINE_LOGIC === "0x0000000000000000000000000000000000000000" &&
      TRUSTLINE_VALIDATION_ENGINE_PROXY === "0x0000000000000000000000000000000000000000") {
    throw new Error("ERROR: Using zero addresses for Trustline Validation Engine logic and proxy. Please set TRUSTLINE_VALIDATION_ENGINE_LOGIC or TRUSTLINE_VALIDATION_ENGINE_PROXY environment variables.");
  }

  // Deploy PaymentFirewall
  const PaymentFirewall = await ethers.getContractFactory("PaymentFirewall");
  const paymentFirewall = await PaymentFirewall.deploy(
    TRUSTLINE_VALIDATION_ENGINE_LOGIC,
    TRUSTLINE_VALIDATION_ENGINE_PROXY
  );

  await paymentFirewall.waitForDeployment();
  const address = await paymentFirewall.getAddress();

  console.log("PaymentFirewall deployed to:", address);

  // Export the contract address and ABI for frontend use
  console.log("\n=== Deployment Info ===");
  console.log("Contract Address:", address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

