pragma solidity ^0.4.20;

contract EthicHubReputationInterface {
    modifier onlyUsersContract(){_;}
    function burnReputation(uint delayDays) external;
    function incrementReputation() external;
    function initLocalNodeReputation(address localNode) onlyUsersContract external;
    function initCommunityReputation(address community) onlyUsersContract external;
    function getCommunityReputation(address target) public view returns(uint256);
    function getLocalNodeReputation(address target) public view returns(uint256);
}
