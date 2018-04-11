pragma solidity ^0.4.18;

import "./math/SafeMath.sol";
import "./ownership/Ownable.sol";
import "./Lending.sol";


contract Reputation is Ownable {
    enum UserType {Borrower, LocalNode}
    enum ContractStatus {NotAccessible, WaitingFeedback, FeedbackGiven}
    mapping(address => uint) public borrowers;
    mapping(address => uint) public localNodes;
    mapping(address => ContractStatus) public lendingContracts;
    address[] public lendingContractsList;
    
    modifier onlyLendingContracts() {
        require(lendingContracts[msg.sender] != ContractStatus.NotAccessible);
        _;
    }

    modifier onlyWaitingFeedbackLendingContracts() {
        require(lendingContracts[msg.sender] == ContractStatus.WaitingFeedback);
        _;
    }
    event LendingContractCreated(address contractAddress);
    
    function addLendingContract(uint _fundingStartTime, uint _fundingEndTime, address _borrower, uint _lendingInterestRatePercentage, uint _totalLendingAmount, uint256 _lendingDays) public onlyOwner{
        Lending lending = new Lending(_fundingStartTime, _fundingEndTime, _borrower, _lendingInterestRatePercentage, _totalLendingAmount, _lendingDays, address(this));
        lendingContracts[address(lending)] = ContractStatus.WaitingFeedback;
        LendingContractCreated(address(lending));
        lendingContractsList.push(address(lending));
    }

    function giveRep(address target, uint _type) public onlyWaitingFeedbackLendingContracts {
        if (UserType(_type) == UserType.Borrower){
            borrowers[target] += 1;
        }
        else if (UserType(_type) == UserType.LocalNode){
            localNodes[target] += 1;
        }
        lendingContracts[msg.sender] = ContractStatus.FeedbackGiven;
    }

    function burnRep(address target, uint _type) public onlyWaitingFeedbackLendingContracts {
        if (UserType(_type) == UserType.Borrower){
            borrowers[target] -= 1;
        }
        else if (UserType(_type) == UserType.LocalNode){
            localNodes[target] -= 1;
        }
        lendingContracts[msg.sender] = ContractStatus.FeedbackGiven;
    }

    function viewRep(address target, uint _type) public view returns(uint score){
        if (UserType(_type) == UserType.Borrower){
            score = borrowers[target];
        }
        else if (UserType(_type) == UserType.LocalNode){
            score = localNodes[target];
        }
    }

}
