// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Trustlined} from "@trustline.id/evmsdk/contracts/Trustlined.sol";

/// @title PaymentFirewall
/// @author Trustline
/// @notice This contract is a firewall ensuring all funds going out are sent by a verified user
contract PaymentFirewall is Trustlined, ReentrancyGuard {
    constructor(address trustlineValidationEngineLogic, address trustlineValidationEngineProxy) Trustlined(trustlineValidationEngineLogic, trustlineValidationEngineProxy) {}

    /// @notice Pay native ethers to a recipient
    /// @param dest the destination address of the funds
    function payEthers(address payable dest) public payable nonReentrant {
        require(dest != address(0), "Invalid destination");
        require(msg.value > 0, "Invalid amount");

        // the line for protecting this method
        requireTrustline();

        // the usual part of the method to send the amount of ETH to the dest address
        uint256 amount = msg.value;
        (bool sent, ) = dest.call{value: amount}("");

        require(sent, "Unable to pay ethers");
    }
}
