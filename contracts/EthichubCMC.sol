pragma solidity ^0.4.23;

import "./ownership/Ownable.sol";
import "./EthicHubBase.sol";

/**
 * @title EthichubCMC 
 * @dev This contract manage ethichub contracts creation and update.
 */

contract EthicHubCMC is EthicHubBase, Ownable {


    constructor(address _storageAddress) EthicHubBase(_storageAddress) public {
        // Version
        version = 1;
    } 

    function registerEthicHubContract(address _address) internal{
        ethicHubStorage.setAddress(keccak256("ethichub.contract", _address), _address);
    }

    function deleteEthicHubContract(address _address) internal{
        ethicHubStorage.deleteAddress(keccak256("ethichub.contract", _address));
    }
    
    function addNewLendingContract(address lendingAddress) public onlyOwner{
        //create current reputation address
        registerEthicHubContract(lendingAddress);
    }

    function addNewReputationContract(address reputationAddress) public onlyOwner{
        registerEthicHubContract(reputationAddress);
        address oldReputationAddress = ethicHubStorage.getAddress(keccak256("ethichub.contract.reputation"));
        deleteEthicHubContract(oldReputationAddress);
        // update new reputation address
        ethicHubStorage.setAddress(keccak256("ethichub.contract.reputation") , reputationAddress);
    }
}
