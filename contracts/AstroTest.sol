// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Test Token for Testing Purpose only
contract AstroToken is ERC20 {
    constructor(uint256 initialBalance) ERC20("Astro Test Token", "ASTRO") {
        _mint(msg.sender, initialBalance);
    }
}
