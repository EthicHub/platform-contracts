/*
    Smart contract of Lending.

    Copyright (C) 2018 EthicHub

    This file is part of platform contracts.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
pragma solidity ^0.4.21;

import "./math/SafeMath.sol";
import "./lifecycle/Pausable.sol";
import "./ownership/Ownable.sol";
import "./Whitelist.sol";


contract Lending is Ownable, Pausable {
    using SafeMath for uint256;
    uint256 public minContribAmount = 0.1 ether;                          // 0.01 ether
    enum LendingState {AcceptingContributions, AwaitingReturn, ProjectNotFunded, ContributionReturned}

    mapping(address => Investor) public investors;
    uint256 public fundingStartTime;                                     // Start time of contribution period in UNIX time
    uint256 public fundingEndTime;                                       // End time of contribution period in UNIX time
    uint256 public totalContributed;
    bool public capReached;
    LendingState public state;
    address[] public investorsKeys;
    Whitelist public whitelist;

    uint256 public lendingInterestRatePercentage;
    uint256 public totalLendingAmount;
    uint256 public lendingDays;
    uint256 public initialEthPerFiatRate;
    uint256 public totalLendingFiatAmount;
    address public borrower;
    uint256 public borrowerReturnDate;
    uint256 public borrowerReturnFiatAmount;
    uint256 public borrowerReturnEthPerFiatRate;
    uint256 public borrowerReturnAmount;

    struct Investor {
        uint amount;
        bool isCompensated;
    }

    // events
    event onCapReached(uint endTime);
    event onContribution(uint totalContributed, address indexed investor, uint amount, uint investorsCount);
    event onCompensated(address indexed contributor, uint amount);
    event StateChange(uint state);

    function Lending(uint _fundingStartTime, uint _fundingEndTime, address _borrower, uint _lendingInterestRatePercentage, uint _totalLendingAmount, uint256 _lendingDays, Whitelist _whitelist) public {
        fundingStartTime = _fundingStartTime;
        fundingEndTime = _fundingEndTime;
        borrower = _borrower;
        whitelist = _whitelist;
        // 115
        lendingInterestRatePercentage = _lendingInterestRatePercentage;
        totalLendingAmount = _totalLendingAmount;
        //90 days for version 0.1
        lendingDays = _lendingDays;
        state = LendingState.AcceptingContributions;
        emit StateChange(uint(state));
    }

    function() public payable whenNotPaused {
        if(state == LendingState.AwaitingReturn){
            returnBorroweedEth();
        } else{
            contributeWithAddress(msg.sender);
        }
    }

    function isContribPeriodRunning() public constant returns(bool){
        return fundingStartTime <= now && fundingEndTime > now && !capReached;
    }

    // @notice Function to participate in contribution period
    //  Amounts from the same address should be added up
    //  If cap is reached, end time should be modified
    //  Funds should be transferred into multisig wallet
    // @param contributor Address
    function contributeWithAddress(address contributor) public payable whenNotPaused {
        require(msg.value >= minContribAmount);
        require(isContribPeriodRunning());
        // require contributor whitelisted
        require(whitelist.viewRegistrationStatus(contributor));

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
            fundingEndTime = now;
            emit onCapReached(fundingEndTime);

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
        emit onContribution(newTotalContributed, contributor, contribValue, investorsKeys.length);
    }

    function enableReturnContribution() external onlyOwner {
        require(totalContributed < totalLendingAmount);
        require(now > fundingEndTime);
        state = LendingState.ProjectNotFunded;
        emit StateChange(uint(state));
    }

    function finishContributionPeriod(uint256 _initialEthPerFiatRate) onlyOwner {
        require(capReached == true);
        initialEthPerFiatRate = _initialEthPerFiatRate;
        borrower.transfer(totalContributed);
        state = LendingState.AwaitingReturn;
        emit StateChange(uint(state));
        totalLendingFiatAmount = totalLendingAmount.mul(initialEthPerFiatRate);
        borrowerReturnFiatAmount = totalLendingFiatAmount.mul(lendingInterestRatePercentage).div(100);
    }

    function reclaimContribution(address beneficiary) external {
        require(state == LendingState.ProjectNotFunded);
        uint contribution = investors[beneficiary].amount;
        require(contribution > 0);
        beneficiary.transfer(contribution);
    }

    function establishBorrowerReturnEthPerFiatRate(uint256 _borrowerReturnEthPerFiatRate) external onlyOwner{
        require(state == LendingState.AwaitingReturn);
        borrowerReturnEthPerFiatRate = _borrowerReturnEthPerFiatRate;
        borrowerReturnAmount = borrowerReturnFiatAmount.div(borrowerReturnEthPerFiatRate);
    }

    function returnBorroweedEth() payable public {
        require(state == LendingState.AwaitingReturn);
        require(borrowerReturnEthPerFiatRate > 0);
        require(msg.value == borrowerReturnAmount);
        state = LendingState.ContributionReturned;
        emit StateChange(uint(state));
    }

    function reclaimContributionWithInterest(address beneficiary) external{
        require(state == LendingState.ContributionReturned);
        uint contribution = investors[beneficiary].amount.mul(initialEthPerFiatRate).mul(lendingInterestRatePercentage).div(borrowerReturnEthPerFiatRate).div(100);
        require(contribution > 0);
        beneficiary.transfer(contribution);
    }

    function selfKill() external onlyOwner {
        selfdestruct(owner);
    }
}
