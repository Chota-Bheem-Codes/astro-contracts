// SPDX-License-Identifier: MIT

pragma solidity >=0.6.11;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MetaInitializable is Initializable {
    bool inited;

    function __MetaInitializable_init() internal initializer {
        inited = false;
    }

    modifier metaInitializer() {
        require(!inited, "already inited");
        _;
        inited = true;
    }
}
