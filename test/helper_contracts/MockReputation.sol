pragma solidity ^0.4.20;

import "../../contracts/reputation/EthicHubReputationInterface.sol";


contract MockReputation is EthicHubReputationInterface {
    bool public burnCalled = false;
    bool public incrementCalled = false;

    function burnReputation(uint delayDays) onlyLendingContract external {
        burnCalled = true;
    }

    function incrementReputation(uint completedProjectsByTier) onlyLendingContract external {
        incrementCalled = true;
    }

    function initLocalNodeReputation(address localNode) onlyUsersContract external {
        uint blah = 2;
    }

    function initCommunityReputation(address community) onlyUsersContract external {
        uint blah = 2;
    }

    function getCommunityReputation(address target) public view returns(uint256) {
        return 5;
    }

    function getLocalNodeReputation(address target) public view returns(uint256) {
        return 5;
    }
}
