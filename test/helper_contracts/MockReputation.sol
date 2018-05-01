pragma solidity ^0.4.20;

import "../../contracts/reputation/EthicHubReputationInterface.sol";


contract MockReputation is EthicHubReputationInterface {
    string foo;

    function burnReputation() external {
        foo = "bar";
    }

    function incrementReputation() external {
        foo = "bar";
    }
}
