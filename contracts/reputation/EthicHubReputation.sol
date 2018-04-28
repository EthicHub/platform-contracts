pragma solidity ^0.4.20;

import '../EthicHubBase.sol';

contract EthicHubReputation is EthicHubBase {

    /// @dev constructor
    function EthicHubReputation(address _storageAddress) EthicHubBase(_storageAddress) public {
      // Version
      version = 1;
    }

}
