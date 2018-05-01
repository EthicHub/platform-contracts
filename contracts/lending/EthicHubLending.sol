pragma solidity ^0.4.23;


import "../math/SafeMath.sol";
import "../lifecycle/Pausable.sol";
import "../ownership/Ownable.sol";
import "../reputation/EthicHubReputationInterface.sol";
import "../EthicHubBase.sol";

contract EthicHubLending is EthicHubBase, Ownable, Pausable {
    using SafeMath for uint256;
    uint256 public minContribAmount = 0.1 ether;                          // 0.01 ether
    enum LendingState {
        Uninitialized,
        AcceptingContributions,
        ExchangingToFiat,
        AwaitingReturn,
        ProjectNotFunded,
        ContributionReturned
    }

    mapping(address => Investor) public investors;
    uint256 public fundingStartTime;                                     // Start time of contribution period in UNIX time
    uint256 public fundingEndTime;                                       // End time of contribution period in UNIX time
    uint256 public totalContributed;
    bool public capReached;
    LendingState public state;
    address[] public investorsKeys;

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

    address private reputation = EthicHubReputationInterface(0);

    struct Investor {
        uint amount;
        bool isCompensated;
    }

    // events
    event onCapReached(uint endTime);
    event onContribution(uint totalContributed, address indexed investor, uint amount, uint investorsCount);
    event onCompensated(address indexed contributor, uint amount);
    event StateChange(uint state);
    event onInitalRateSet(uint rate);
    event onReturnRateSet(uint rate);


    function EthicHubLending(
        uint _fundingStartTime,
        uint _fundingEndTime,
        address _borrower,
        uint _lendingInterestRatePercentage,
        uint _totalLendingAmount,
        uint256 _lendingDays,
        address _storageAddress
        )
        EthicHubBase(_storageAddress)
        public {

        version = 1;
        fundingStartTime = _fundingStartTime;
        require(_fundingEndTime > fundingStartTime);
        fundingEndTime = _fundingEndTime;
        require(_borrower != address(0));
        borrower = _borrower;
        // 115
        lendingInterestRatePercentage = _lendingInterestRatePercentage;
        require(totalLendingAmount > 0);
        totalLendingAmount = _totalLendingAmount;
        //90 days for version 0.1
        require(_lendingDays > 0);
        lendingDays = _lendingDays;

        reputation = EthicHubReputationInterface(ethicHubStorage.getAddress(keccak256("contract.name", "reputation")));
        require(reputation != address(0));
        state = LendingState.Uninitialized;
    }

    function saveInitialParametersToStorage(uint _maxDefaultDays, uint _tier) external onlyOwner {
        require(_maxDefaultDays != 0);
        ethicHubStorage.setUint(keccak256("lending.maxDefaultDays", this), _maxDefaultDays);
        ethicHubStorage.setAddress(keccak256("lending.community",this), borrower);
        ethicHubStorage.setAddress(keccak256("lending.localNode",this), msg.sender);
        ethicHubStorage.setUint(keccak256("lending.tier",this), _tier);

        state = LendingState.AcceptingContributions;
        emit StateChange(uint(state));

    }

    function() public payable whenNotPaused {
      require(state == LendingState.AwaitingReturn || state == LendingState.AcceptingContributions);
        if(state == LendingState.AwaitingReturn) {
            returnBorrowedEth();
        } else {
            contributeWithAddress(msg.sender);
        }
    }

    /**
     * After the contribution period ends unsuccesfully, this method enables the contributor
     *  to retrieve their contribution
     */
    function declareProjectNotFunded() external onlyOwner {
        require(totalContributed < totalLendingAmount);
        require(state == LendingState.AcceptingContributions);
        require(now > fundingEndTime);
        state = LendingState.ProjectNotFunded;
        emit StateChange(uint(state));
    }

    function setBorrowerReturnEthPerFiatRate(uint256 _borrowerReturnEthPerFiatRate) external onlyOwner {
        require(state == LendingState.AwaitingReturn);
        borrowerReturnEthPerFiatRate = _borrowerReturnEthPerFiatRate;
        borrowerReturnAmount = borrowerReturnFiatAmount.div(borrowerReturnEthPerFiatRate);
        emit onReturnRateSet(borrowerReturnEthPerFiatRate);

    }

    function finishInitialExchangingPeriod(uint256 _initialEthPerFiatRate) external onlyOwner {
        require(capReached == true);
        require(state == LendingState.ExchangingToFiat);
        initialEthPerFiatRate = _initialEthPerFiatRate;
        totalLendingFiatAmount = totalLendingAmount.mul(initialEthPerFiatRate);
        borrowerReturnFiatAmount = totalLendingFiatAmount.mul(lendingInterestRatePercentage).div(100);
        emit onInitalRateSet(initialEthPerFiatRate);
        state = LendingState.AwaitingReturn;
        emit StateChange(uint(state));
    }

    /**
     * Method to reclaim contribution after a project is declared as not funded
     * @param  beneficiary the contributor
     *
     */
    function reclaimContribution(address beneficiary) external {
        require(state == LendingState.ProjectNotFunded);
        uint contribution = investors[beneficiary].amount;
        require(contribution > 0);
        beneficiary.transfer(contribution);
    }

    function reclaimContributionWithInterest(address beneficiary) external {
        require(state == LendingState.ContributionReturned);
        uint contribution = investors[beneficiary].amount.mul(initialEthPerFiatRate).mul(lendingInterestRatePercentage).div(borrowerReturnEthPerFiatRate).div(100);
        require(contribution > 0);
        beneficiary.transfer(contribution);
    }

    function returnBorrowedEth() payable public {
        require(state == LendingState.AwaitingReturn);
        require(borrowerReturnEthPerFiatRate > 0);
        require(msg.value == borrowerReturnAmount);



        state = LendingState.ContributionReturned;
        emit StateChange(uint(state));
    }

    function selfKill() external onlyOwner {
        selfdestruct(owner);
    }




    // @notice Function to participate in contribution period
    //  Amounts from the same address should be added up
    //  If cap is reached, end time should be modified
    //  Funds should be transferred into multisig wallet
    // @param contributor Address
    function contributeWithAddress(address contributor) public payable whenNotPaused {
        require(state == LendingState.AcceptingContributions);
        require(msg.value >= minContribAmount);
        require(isContribPeriodRunning());

        uint contribValue = msg.value;
        uint excessContribValue = 0;
        uint oldTotalContributed = totalContributed;
        totalContributed = oldTotalContributed.add(contribValue);
        uint newTotalContributed = totalContributed;

        // cap was reached
        if (newTotalContributed >= totalLendingAmount &&
            oldTotalContributed < totalLendingAmount) {
            capReached = true;
            fundingEndTime = now;
            emit onCapReached(fundingEndTime);

            // Everything above hard cap will be sent back to contributor
            excessContribValue = newTotalContributed.sub(totalLendingAmount);
            contribValue = contribValue.sub(excessContribValue);

            totalContributed = totalLendingAmount;

            sendFundsToBorrower();
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



    function isContribPeriodRunning() public constant returns(bool) {
        return fundingStartTime <= now && fundingEndTime > now && !capReached;
    }

    function sendFundsToBorrower() internal {
      //Waiting for Exchange
        require(capReached);
        state = LendingState.ExchangingToFiat;
        emit StateChange(uint(state));
        borrower.transfer(totalContributed);
    }




}
