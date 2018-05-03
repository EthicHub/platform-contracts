pragma solidity ^0.4.20;

import "../../contracts/EthicHubBase.sol";


contract MockEthicHubContract is EthicHubBase {

    /// @dev constructor
    function MockEthicHubContract(address _storageAddress, uint8 _version) EthicHubBase(_storageAddress) public {
      // Version
        version = _version;
    }

    function getStorageAddress() public view returns (address) {
        return ethicHubStorage;
    }

}
