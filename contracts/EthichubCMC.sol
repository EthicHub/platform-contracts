pragma solidity ^0.4.23;

//import "../ownership/Ownable.sol";

/**
 * @title EthichubCMC 
 * @dev This contract manage ethichub contracts creation and update.
 */

contract EthichubCMC is Ownable {
    function constructor() {

    } 
    function registerContract(address _address){
        setAddress(keccak256("contract.address", _address), _address);
    }

    function createLending(address _address){
        //create current reputation address
    }

    function createReputation(address _address){
        //register current reputation address 
        //remove previous reputation address 
    }
}
