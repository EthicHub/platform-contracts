pragma solidity ^0.4.20;

import "../../contracts/reputation/EthicHubReputationInterface.sol";


contract MockReputation is EthicHubReputationInterface {
    bool public burnCalled = false;
    bool public incrementCalled = false;

    function burnReputation() external {
        burnCalled = true;
    }

    function incrementReputation() external {
        incrementCalled = true;
    }
}
