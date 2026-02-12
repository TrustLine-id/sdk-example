import * as fs from 'fs';
import * as path from 'path';

async function copyABI() {
  // Try Hardhat artifacts first
  const hardhatArtifactsPath = path.join(__dirname, '../artifacts/contracts/PaymentFirewall.sol/PaymentFirewall.json');
  // Try Foundry artifacts
  const foundryArtifactsPath = path.join(__dirname, '../out/PaymentFirewall.sol/PaymentFirewall.json');
  const frontendABIPath = path.join(__dirname, '../../frontend/src/abis/PaymentFirewall.json');

  let artifactPath: string | null = null;
  
  // Check which build system was used
  if (fs.existsSync(hardhatArtifactsPath)) {
    artifactPath = hardhatArtifactsPath;
    console.log('Using Hardhat artifacts');
  } else if (fs.existsSync(foundryArtifactsPath)) {
    artifactPath = foundryArtifactsPath;
    console.log('Using Foundry artifacts');
  } else {
    console.error('Contract artifacts not found. Please compile the contracts first:');
    console.error('  - Hardhat: npm run compile');
    console.error('  - Foundry: npm run compile:forge');
    process.exit(1);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  const abiData = {
    abi: artifact.abi
  };

  // Ensure frontend abis directory exists
  const abiDir = path.dirname(frontendABIPath);
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  fs.writeFileSync(frontendABIPath, JSON.stringify(abiData, null, 2));
  console.log('✅ ABI copied to frontend successfully!');
}

copyABI().catch(console.error);

