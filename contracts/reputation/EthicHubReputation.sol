pragma solidity ^0.4.23;

import '../EthicHubBase.sol';
import '../math/SafeMath.sol';
import './EthicHubReputationInterface.sol';

contract EthicHubReputation is EthicHubBase, EthicHubReputationInterface {

    //10 with 2 decilmals
    uint maxReputation = 1000;
    uint reputationStep = 100;
    //Tier 1 x 20 people
    uint minProyect = 20;
    uint constant public initReputation = 500;

    //0.05
    uint incrLocalNodeMultiplier = 5;

    using SafeMath for uint;

    event ReputationUpdated(address indexed affected, uint newValue);

    event Log(uint value);

    /*** Modifiers ************/

    /// @dev Only allow access from the latest version of a contract in the Rocket Pool network after deployment
    modifier onlyUsersContract() {
        require(ethicHubStorage.getAddress(keccak256("contract.name", "users")) == msg.sender);
        _;
    }

    /// @dev constructor
    constructor(address _storageAddress) EthicHubBase(_storageAddress) public {
      // Version
      version = 1;
    }

    function burnReputation() external {
        address lendingContract = msg.sender;
        //Get temporal parameters
        uint maxDefaultDays = ethicHubStorage.getUint(keccak256("lending.maxDefaultDays", lendingContract));
        require(maxDefaultDays != 0);
        uint defaultDays = ethicHubStorage.getUint(keccak256("lending.defaultDays", lendingContract));
        require(defaultDays != 0);

        //Affected players
        address community = ethicHubStorage.getAddress(keccak256("lending.community", lendingContract));
        require(community != address(0));
        //Affected local node
        address localNode = ethicHubStorage.getAddress(keccak256("lending.localNode", lendingContract));
        require(localNode != address(0));

        //***** Community
        uint previousCommunityReputation = ethicHubStorage.getUint(keccak256("community.reputation", community));
        //Calculation and update
        uint newCommunityReputation = burnCommunityReputation(defaultDays, maxDefaultDays, previousCommunityReputation);
        ethicHubStorage.setUint(keccak256("community.reputation", community), newCommunityReputation);
        emit ReputationUpdated(community, newCommunityReputation);

        //***** Local node
        uint previousLocalNodeReputation = ethicHubStorage.getUint(keccak256("localNode.reputation", localNode));
        uint newLocalNodeReputation = burnLocalNodeReputation(defaultDays, maxDefaultDays, previousLocalNodeReputation);
        ethicHubStorage.setUint(keccak256("localNode.reputation", localNode), newLocalNodeReputation);
        emit ReputationUpdated(localNode, newLocalNodeReputation);

    }

    function incrementReputation() external {
        address lendingContract = msg.sender;
        //Affected players
        address community = ethicHubStorage.getAddress(keccak256("lending.community", lendingContract));
        require(community != address(0));
        //Affected local node
        address localNode = ethicHubStorage.getAddress(keccak256("lending.localNode", lendingContract));
        require(localNode != address(0));

        //Tier
        uint projectTier = ethicHubStorage.getUint(keccak256("lending.tier", lendingContract));
        require(projectTier > 0);
        uint succesfulProjectsInTier = ethicHubStorage.getUint(keccak256("community.completedProjectsByTier",lendingContract, projectTier));
        require(succesfulProjectsInTier > 1);

        //***** Community
        uint previousCommunityReputation = ethicHubStorage.getUint(keccak256("community.reputation", community));
        //Calculation and update
        uint newCommunityReputation = incrementCommunityReputation(previousCommunityReputation, succesfulProjectsInTier);
        ethicHubStorage.setUint(keccak256("community.reputation", community), newCommunityReputation);
        emit ReputationUpdated(community, newCommunityReputation);

        //***** Local node
        uint borrowers = ethicHubStorage.getUint(keccak256("lending.borrowers", lendingContract));
        uint previousLocalNodeReputation = ethicHubStorage.getUint(keccak256("localNode.reputation", localNode));
        uint newLocalNodeReputation = incrementLocalNodeReputation(previousLocalNodeReputation, projectTier, borrowers);
        ethicHubStorage.setUint(keccak256("localNode.reputation", localNode), newLocalNodeReputation);
        emit ReputationUpdated(localNode, newLocalNodeReputation);
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
        uint increment = (tier.mul(borrowers).div(minProyect)).mul(incrLocalNodeMultiplier);
        uint nextRep = previousReputation.add(increment);
        if (nextRep >= maxReputation) {
            return maxReputation;
        } else {
            return nextRep;
        }
    }

    function burnLocalNodeReputation(uint defaultDays, uint maxDefaultDays, uint prevReputation) view returns(uint) {
        uint decrement = prevReputation.mul(defaultDays).div(maxDefaultDays);
        if (defaultDays < maxDefaultDays && decrement < reputationStep) {
            return prevReputation.sub(decrement);
        } else {
            return prevReputation.sub(reputationStep);
        }
    }

    function burnCommunityReputation(uint defaultDays, uint maxDefaultDays, uint prevReputation) pure returns(uint) {
        if (defaultDays < maxDefaultDays) {
            return prevReputation.sub(prevReputation.mul(defaultDays).div(maxDefaultDays));
        } else {
            return 0;
        }
    }


    function initLocalNodeReputation(address localNode) onlyUsersContract public {
        require(ethicHubStorage.getUint(keccak256("localNode.reputation", localNode)) == 0);
        ethicHubStorage.setUint(keccak256("localNode.reputation", localNode), initReputation);
    }


    function initCommunityReputation(address community) onlyUsersContract public {
        require(ethicHubStorage.getUint(keccak256("comunity.reputation", community)) == 0);
        ethicHubStorage.setUint(keccak256("community.reputation", community), initReputation);
    }

}
