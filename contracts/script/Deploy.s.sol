// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {PaymentFirewall} from "../contracts/PaymentFirewall.sol";

contract DeployPaymentFirewall is Script {
    function run() external returns (address) {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Get Trustline Validation Engine addresses from environment
        address trustlineValidationEngineLogic = vm.envAddress("TRUSTLINE_VALIDATION_ENGINE_LOGIC");
        address trustlineValidationEngineProxy = vm.envAddress("TRUSTLINE_VALIDATION_ENGINE_PROXY");

        // Deploy PaymentFirewall
        PaymentFirewall paymentFirewall = new PaymentFirewall(
            trustlineValidationEngineLogic,
            trustlineValidationEngineProxy
        );

        vm.stopBroadcast();

        console.log("PaymentFirewall deployed to:", address(paymentFirewall));
        console.log("Chain ID:", block.chainid);

        return address(paymentFirewall);
    }
}

