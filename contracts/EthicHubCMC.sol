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

    modifier onlyOwnerOrLocalNode() {
        bool isLocalNode = ethicHubStorage.getBool(keccak256("user", "localNode", msg.sender));
        require(isLocalNode || owner == msg.sender);
        _;
    }

    constructor(address _storageAddress) EthicHubBase(_storageAddress) public {
        // Version
        version = 1;
    }

    function addNewLendingContract(address _lendingAddress) public onlyOwnerOrLocalNode {
        require(_lendingAddress != address(0));
        ethicHubStorage.setAddress(keccak256("contract.address", _lendingAddress), _lendingAddress);
    }

    function upgradeContract(address _newContractAddress, string _contractName) public onlyOwner {
        require(_newContractAddress != address(0));
        require(keccak256("contract.name","") != keccak256("contract.name",_contractName);
        address oldAddress = ethicHubStorage.getAddress(keccak256("contract.name", _contractName));
        ethicHubStorage.setAddress(keccak256("contract.address", _newContractAddress), _newContractAddress);
        ethicHubStorage.setAddress(keccak256("contract.name", _contractName), _newContractAddress);
        ethicHubStorage.deleteAddress(keccak256("contract.address", oldAddress));
        emit ContractUpgraded(oldAddress, _newContractAddress, now);
    }
}
