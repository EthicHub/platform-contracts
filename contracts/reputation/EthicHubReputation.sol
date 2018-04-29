pragma solidity ^0.4.23;

import '../EthicHubBase.sol';
import '../math/SafeMath.sol';

contract EthicHubReputation is EthicHubBase {

    using SafeMath for uint;

    event ReputationUpdated(address indexed affected, uint newValue);

    /// @dev constructor
    constructor(address _storageAddress) EthicHubBase(_storageAddress) public {
      // Version
      version = 1;
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

    function burnCommunityReputation(uint defaultDays, uint maxDefaultDays, uint prevReputation) view returns(uint) {
        if (defaultDays < maxDefaultDays) {
            return prevReputation.sub(prevReputation.mul(defaultDays).div(maxDefaultDays));
        } else {
            return 0;
        }
    }


}
