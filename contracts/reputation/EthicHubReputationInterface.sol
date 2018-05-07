pragma solidity ^0.4.20;

contract EthicHubReputationInterface {
    modifier onlyUsersContract(){_;}
    function burnReputation() external;
    function incrementReputation() external;
    function initLocalNodeReputation(address localNode) onlyUsersContract external;
    function initCommunityReputation(address community) onlyUsersContract external;
}
