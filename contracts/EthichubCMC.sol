pragma solidity ^0.4.23;

import "./ownership/Ownable.sol";
import "./EthicHubBase.sol";

/**
 * @title EthichubCMC
 * @dev This contract manage ethichub contracts creation and update.
 */

contract EthicHubCMC is EthicHubBase, Ownable {

    event ContractUpgraded (
        address indexed _oldContractAddress,                    // Address of the contract being upgraded
        address indexed _newContractAddress,                    // Address of the new contract
        uint256 created                                         // Creation timestamp
    );

    constructor(address _storageAddress) EthicHubBase(_storageAddress) public {
        // Version
        version = 1;
    }

    function registerEthicHubContract(address _address, string _contractName) internal{
        ethicHubStorage.setAddress(keccak256("contract.name", _contractName), _address);


    }

    function addNewLendingContract(address _lendingAddress) public onlyOwner{
        //create current reputation address
        ethicHubStorage.setAddress(keccak256("contract.address", _lendingAddress), _lendingAddress);
    }

    function upgradeContract(address _newContractAddress, string _contractName) public onlyOwner{
        address oldAddress = ethicHubStorage.getAddress(keccak256("contract.name", _contractName));
        ethicHubStorage.setAddress(keccak256("contract.address", _newContractAddress), _newContractAddress);
        ethicHubStorage.setAddress(keccak256("contract.name", _contractName), _newContractAddress);
        ethicHubStorage.deleteAddress(keccak256("contract.address", oldAddress));
        emit ContractUpgraded(oldAddress, _newContractAddress, now);
    }
}
