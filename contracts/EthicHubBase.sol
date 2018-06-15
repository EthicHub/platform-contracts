pragma solidity ^0.4.23;

import "./storage/EthicHubStorageInterface.sol";


contract EthicHubBase {

    uint8 public version;

    EthicHubStorageInterface public ethicHubStorage = EthicHubStorageInterface(0);

    constructor(address _storageAddress) public {
        // Update the contract address
        ethicHubStorage = EthicHubStorageInterface(_storageAddress);
    }

}
