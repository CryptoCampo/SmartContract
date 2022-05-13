//SPDX-License-Identifier: None
pragma solidity ^0.8.1;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract BUSD is ERC20 {
    constructor() ERC20("BUSD", "BUSD") {
        _mint(msg.sender, 10000000 * 10 ** 18);
    }
}