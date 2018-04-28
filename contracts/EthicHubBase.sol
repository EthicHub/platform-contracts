pragma solidity ^0.4.21;

import "./storage/EthicHubStorageInterface.sol";


contract EthicHubBase {

    uint8 public version;

    EthicHubStorageInterface ethicHubStorage = EthicHubStorageInterface(0);

    function EthicHubBase(address _storageAddress) public {
        // Update the contract address
        ethicHubStorage = EthicHubStorageInterface(_storageAddress);
    }

}
