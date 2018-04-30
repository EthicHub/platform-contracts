pragma solidity ^0.4.20;

import '../EthicHubBase.sol';
import '../math/SafeMath.sol';

contract EthicHubReputation is EthicHubBase {

    //10 with 2 decilmals
    uint maxReputation = 1000;
    uint reputationStep = 100;
    //Tier 1 x 20 people
    uint minProyect = 20;

    //0.01
    uint incrLocalNodeMultiplier;
    uint burnLocalNodeMultiplier;

    using SafeMath for uint;

    event ReputationUpdated(address indexed affected, uint newValue);

    /// @dev constructor
    function EthicHubReputation(address _storageAddress, uint _incrLocalNodeMultiplier, uint _burnLocalNodeMultiplier) EthicHubBase(_storageAddress) public {
      // Version
      version = 1;
      incrLocalNodeMultiplier = _incrLocalNodeMultiplier;
      burnLocalNodeMultiplier = _burnLocalNodeMultiplier;
    }

    function burnReputation(address _lendingContract) external {
        //Get temporal parameters
        uint maxDefaultDays = ethicHubStorage.getUint(keccak256("lending.maxDefaultDays", _lendingContract));
        uint defaultDays = ethicHubStorage.getUint(keccak256("lending.defaultDays", _lendingContract));
        //Affected community
        address community = ethicHubStorage.getAddress(keccak256("lending.community", _lendingContract));
        require(community != address(0));
        uint previousCommunityReputation = ethicHubStorage.getUint(keccak256("community.reputation", community));
        //Calculation and update
        uint newCommunityReputation = burnCommunityReputation(defaultDays, maxDefaultDays, previousCommunityReputation);
        ethicHubStorage.setUint(keccak256("community.reputation", community), newCommunityReputation);
        emit ReputationUpdated(community, newCommunityReputation);
    }

    function incrementCommunityReputation(uint previousReputation, uint succesfulSametierProjects) view returns(uint) {
        require(succesfulSametierProjects > 0);
        uint nextRep = previousReputation.add(reputationStep / succesfulSametierProjects);
        if (nextRep >= maxReputation) {
            return maxReputation;
        } else {
            return nextRep;
        }
    }

    function incrementLocalNodeReputation(uint previousReputation, uint tier, uint borrowers) view returns(uint) {
        uint increment = incrLocalNodeMultiplier.mul(tier.mul(borrowers)).div(minProyect).div(100);
        uint nextRep = previousReputation.add(increment);
        if (nextRep >= maxReputation) {
            return maxReputation;
        } else {
            return nextRep;
        }
    }

    function burnLocalNodeReputation(uint defaultDays, uint maxDefaultDays, uint prevReputation) view returns(uint) {
        if (defaultDays < maxDefaultDays) {
            return prevReputation.sub(burnLocalNodeMultiplier.mul(prevReputation.mul(defaultDays).div(maxDefaultDays)).div(100));
        } else {
            return 0;
        }
    }

    function burnCommunityReputation(uint defaultDays, uint maxDefaultDays, uint prevReputation) pure returns(uint) {
        if (defaultDays < maxDefaultDays) {
            return prevReputation.sub(prevReputation.mul(defaultDays).div(maxDefaultDays));
        } else {
            return 0;
        }
    }



}
