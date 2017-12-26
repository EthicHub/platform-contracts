pragma solidity ^0.4.18;

import "./SafeMath.sol";
import "./Pausable.sol";


contract Lending is Pausable {
    using SafeMath for uint256;
    uint256 public minContribAmount = 0.1 ether;                          // 0.01 ether
    enum LendingState {Contributing, ContributionSuccessful, ContributionFailed, ContributionReturned}

    mapping(address => Investor) public investors;
    uint256 public fundingStartTime;                                     // Start time of contribution period in UNIX time
    uint256 public fundingEndTime;                                       // End time of contribution period in UNIX time
    uint256 public totalContributed;
    bool public capReached;
    bool public returnsEnabled;
    LendingState public state;

    uint256 public lendingInterestRatePercentage;
    uint256 public totalLendingAmount;
    uint256 public lendingDays;
    uint256 public initialEthPerPesoRate;
    uint256 public totalLendingPesoAmount;
    address public borrower;
    uint256 public borrowerReturnDate;
    uint256 public borrowerReturnPesoAmount;
    uint256 public borrowerReturnEthPerPesoRate;
    uint256 public borrowerReturnEthAmount;
    bool public borrowReturnsEnabled;

    struct Investor {
        uint amount;
        bool isCompensated;
    }

    // events
    event onCapReached(uint endTime);
    event onContribution(uint totalContributed, address indexed investor, uint amount, uint investorsCount);
    event onCompensated(address indexed contributor, uint amount);

    function Lending(uint fundingStartTime, uint fundintEndTime, address _borrower, uint _lendingInterestRatePercentage, uint _totalLendingAmount, uint25 _initialEthPerPesoRate, _lendingDays){
        fundingStartTime = _fundingStartTime;
        fundingEndTime = _fundingEndTime;
        borrower = _borrower;
        /115
        lendingInterestRatePercentage = _lendingInterestRatePercentage;
        totalLendingAmount = _totalLendingAmount;
        initialEthPerPesoRate = _initialEthPerPesoRate;
        totalLendingPesoAmount = totalLendingAmount.mul(initialEthPerPesoRate);
        //90 days for version 0.1
        lendingDays = _lendingDays;
        state = LendingState.Contributing;
    }
    function() payable stopInEmergency {
        contributeWithAddress(msg.sender);
    }

    function isContribPeriodRunning() constant returns(bool){
        return fundingStartTime <= now && fundingEndTime > now && !capReached;
    }

    // @notice Function to participate in contribution period
    //  Amounts from the same address should be added up
    //  If cap is reached, end time should be modified
    //  Funds should be transferred into multisig wallet
    // @param contributor Address 
    function contributeWithAddress(address contributor)
        payable
        stopInEmergency
    {
        require(msg.value >= minContribAmount);
        require(isContribPeriodRunning());

        uint contribValue = msg.value;
        uint excessContribValue = 0;

        uint oldTotalContributed = totalContributed;

        totalContributed = oldTotalContributed.add(contribValue);

        uint newTotalContributed = totalContributed;

        // cap was reached
        if (newTotalContributed >=  totalLendingAmount &&
            oldTotalContributed < totalLendingAmount)
        {
            capReached = true;
            endTime = now;
            onCapReached(endTime);

            // Everything above hard cap will be sent back to contributor
            excessContribValue = newTotalContributed.sub(totalLendingAmount);
            contribValue = contribValue.sub(excessContribValue);

            totalContributed = totalLendingAmount;
        }

        if (investors[contributor].amount == 0) {
            investorsKeys.push(contributor);
        }

        investors[contributor].amount = investors[contributor].amount.add(contribValue);

        if (excessContribValue > 0) {
            msg.sender.transfer(excessContribValue);
        }
        onContribution(newTotalContributed, contributor, contribValue, investorsKeys.length);
    }

    function finishContributionPeriod() onlyOwner {
        if (totalContributed < totalLendingAmount){
            require(now > endTime);
            returnsEnabled = true;
            state = LendingState.ContributionFailed;
        }
        else{
            lendingSuccessful = true;
            borrower.transfer(totalContributed);
            state = LendingState.ContributionSuccessful;
            borrowerReturnPesoAmount = totalLendingPesoAmount.mul(lendingInterestRatePercentage).div(100);
        }
    }

    function reclaimContribution(address beneficiary) {
        require(returnsEnabled);
        uint contribution = investors[beneficiary].amount;
        require(contribution > 0);
        beneficiary.transfer(contribution);
    }

    function establishBorrowerReturnEthPerPesoRate(rate) onlyOwner{
        borrowerReturnEthPerPesoRate = rate;
        borrowerReturnEthAmount = borrowerReturnPesoAmount.div(borrowerReturnEthPerPesoRate);
    }
    
    function returnBorroweedEth() payable {
        require(msg.sender.value == borrowerReturnEthAmount);
        state = LendingState.ContributionReturned;
        borrowReturnsEnabled = true;
    } 

    function reclaimContributionWithInterest(address beneficiary){
        require(borrowReturnsEnabled);
        uint contribution = investors[beneficiary].amount.mul(lendingInterestRatePercentage).div(100);
        require(contribution > 0);
        beneficiary.transfer(contribution);
    }

    function selfkill() onlyOwner {
        selfdestruct(owner);
    }
}



