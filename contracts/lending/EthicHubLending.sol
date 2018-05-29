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
        ContributionReturned,
        Default
    }
    mapping(address => Investor) public investors;
    uint256 public investorCount;
    uint256 public fundingStartTime;                                     // Start time of contribution period in UNIX time
    uint256 public fundingEndTime;                                       // End time of contribution period in UNIX time
    uint256 public totalContributed;
    bool public capReached;
    LendingState public state;
    uint256 public annualInterest;
    uint256 public totalLendingAmount;
    uint256 public lendingDays;
    uint256 public initialEthPerFiatRate;
    uint256 public totalLendingFiatAmount;
    address public borrower;
    address public localNode;
    address public ethicHubTeam;
    uint256 public borrowerReturnDate;
    uint256 public borrowerReturnEthPerFiatRate;
    uint256 public constant ethichubFee = 3;
    uint256 public constant localNodeFee = 4;
    uint256 public tier;
    // interest rate is using base uint 100 and 100% 10000, this means 1% is 100
    // this guarantee we can have a 2 decimal presicion in our calculation
    uint256 public constant interestBaseUint = 100;
    uint256 public constant interestBasePercent = 10000;
    bool public localNodeFeeReclaimed;
    bool public ethicHubTeamFeeReclaimed;
    EthicHubReputationInterface reputation = EthicHubReputationInterface(0);
    uint256 public surplusEth;

    struct Investor {
        uint256 amount;
        bool isCompensated;
        bool surplusEthReclaimed;
    }

    // events
    event onCapReached(uint endTime);
    event onContribution(uint totalContributed, address indexed investor, uint amount, uint investorsCount);
    event onCompensated(address indexed contributor, uint amount);
    event onSurplusSent(uint256 amount);
    event onSurplusReclaimed(address indexed contributor, uint amount);
    event StateChange(uint state);
    event onInitalRateSet(uint rate);
    event onReturnRateSet(uint rate);

    // modifiers
    modifier checkProfileRegistered(string profile) {
        bool isRegistered = ethicHubStorage.getBool(keccak256("user", profile, msg.sender));
        require(isRegistered);
        _;
    }

    modifier onlyOwnerOrLocalNode(string profile) {
        bool isLocalNode = ethicHubStorage.getBool(keccak256("user", profile, msg.sender));
        require(isLocalNode || owner == msg.sender);
        _;
    }

    function EthicHubLending(
        uint _fundingStartTime,
        uint _fundingEndTime,
        address _borrower,
        uint _annualInterest,
        uint _totalLendingAmount,
        uint256 _lendingDays,
        address _storageAddress,
        address _localNode,
        address _ethicHubTeam
        )
        EthicHubBase(_storageAddress)
        public {

        version = 1;
        fundingStartTime = _fundingStartTime;
        require(_fundingEndTime > fundingStartTime);
        fundingEndTime = _fundingEndTime;
        require(_borrower != address(0));
        require(_localNode != address(0));
        require(_ethicHubTeam != address(0));
        localNode = _localNode;
        ethicHubTeam = _ethicHubTeam;

        borrower = _borrower;
        annualInterest = _annualInterest;

        require(_totalLendingAmount > 0);
        totalLendingAmount = _totalLendingAmount;
        //90 days for version 0.1
        require(_lendingDays > 0);
        lendingDays = _lendingDays;

        reputation = EthicHubReputationInterface(ethicHubStorage.getAddress(keccak256("contract.name", "reputation")));
        require(reputation != address(0));

        state = LendingState.Uninitialized;
    }

    function saveInitialParametersToStorage(uint _maxDelayDays, uint _tier, uint _communityMembers, address _community) external onlyOwnerOrLocalNode('localNode') {
        require(_maxDelayDays != 0);
        require(state == LendingState.Uninitialized);
        require(_tier > 0);
        require(_communityMembers >= 20);
        require(ethicHubStorage.getBool(keccak256("user", "community", _community)));
        require(ethicHubStorage.getBool(keccak256("user", "localNode", localNode)));
        ethicHubStorage.setUint(keccak256("lending.maxDelayDays", this), _maxDelayDays);
        ethicHubStorage.setAddress(keccak256("lending.community", this), _community);
        ethicHubStorage.setAddress(keccak256("lending.localNode", this), localNode);
        ethicHubStorage.setUint(keccak256("lending.tier", this), _tier);
        ethicHubStorage.setUint(keccak256("lending.communityMembers", this), _communityMembers);
        tier = _tier;
        state = LendingState.AcceptingContributions;
        emit StateChange(uint(state));

    }

    function() public payable whenNotPaused {
        require(state == LendingState.AwaitingReturn || state == LendingState.AcceptingContributions || state == LendingState.ExchangingToFiat);
        if(state == LendingState.AwaitingReturn) {
            returnBorrowedEth();
        } else if (state == LendingState.ExchangingToFiat) {
            // borrower can send surplus eth back to contract to avoid paying interest
            sendBackSurplusEth();
        } else {
            contributeWithAddress(msg.sender);
        }
    }

    function sendBackSurplusEth() public payable {
        require(state == LendingState.ExchangingToFiat);
        surplusEth = surplusEth.add(msg.value);
        require(surplusEth <= totalLendingAmount);
        onSurplusSent(msg.value);
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

    function declareProjectDefault() external onlyOwner {
        require(state == LendingState.AwaitingReturn);
        uint maxDelayDays = ethicHubStorage.getUint(keccak256("lending.maxDelayDays", this));
        require(getDelayDays(now) >= maxDelayDays);
        ethicHubStorage.setUint(keccak256("lending.delayDays", this), maxDelayDays);
        reputation.burnReputation(maxDelayDays);
        state = LendingState.Default;
        emit StateChange(uint(state));
    }

    function setBorrowerReturnEthPerFiatRate(uint256 _borrowerReturnEthPerFiatRate) external onlyOwner {
        require(state == LendingState.AwaitingReturn);
        borrowerReturnEthPerFiatRate = _borrowerReturnEthPerFiatRate;
        emit onReturnRateSet(borrowerReturnEthPerFiatRate);

    }

    function finishInitialExchangingPeriod(uint256 _initialEthPerFiatRate) external onlyOwner {
        require(capReached == true);
        require(state == LendingState.ExchangingToFiat);
        initialEthPerFiatRate = _initialEthPerFiatRate;
        if (surplusEth > 0){
            totalLendingAmount = totalLendingAmount.sub(surplusEth);
        }
        totalLendingFiatAmount = totalLendingAmount.mul(initialEthPerFiatRate);
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
        uint256 contribution = investors[beneficiary].amount;
        require(contribution > 0);
        require(!investors[beneficiary].isCompensated);
        investors[beneficiary].isCompensated = true;
        beneficiary.transfer(contribution);
    }

    function reclaimSurplusEth(address beneficiary) external {
        require(surplusEth > 0);
        // only can be reclaimed after cap reduced
        require(state != LendingState.ExchangingToFiat);
        require(!investors[beneficiary].surplusEthReclaimed);
        uint256 surplusContribution = investors[beneficiary].amount.mul(surplusEth).div(surplusEth.add(totalLendingAmount));
        require(surplusContribution > 0);
        investors[beneficiary].surplusEthReclaimed = true;
        onSurplusReclaimed(beneficiary, surplusContribution);
        beneficiary.transfer(surplusContribution);
    }

    function reclaimContributionWithInterest(address beneficiary) external {
        require(state == LendingState.ContributionReturned);
        uint256 investorAmount = investors[beneficiary].amount;
        if (surplusEth > 0){
            investorAmount  = investors[beneficiary].amount.mul(totalLendingAmount.sub(surplusEth)).div(totalLendingAmount);
        }
        uint256 contribution = investorAmount.mul(initialEthPerFiatRate).mul(investorInterest()).div(borrowerReturnEthPerFiatRate).div(interestBasePercent);
        require(contribution > 0);
        require(!investors[beneficiary].isCompensated);
        investors[beneficiary].isCompensated = true;
        beneficiary.transfer(contribution);
    }

    function reclaimLocalNodeFee() external {
        require(state == LendingState.ContributionReturned);
        require(localNodeFeeReclaimed == false);
        uint256 fee = borrowerReturnAmount().mul(localNodeFee).mul(interestBaseUint).div(lendingInterestRatePercentage());
        require(fee > 0);
        localNodeFeeReclaimed = true;
        localNode.transfer(fee);
    }

    function reclaimEthicHubTeamFee() external {
        require(state == LendingState.ContributionReturned);
        require(ethicHubTeamFeeReclaimed == false);
        uint256 fee = borrowerReturnAmount().mul(ethichubFee).mul(interestBaseUint).div(lendingInterestRatePercentage());
        require(fee > 0);
        ethicHubTeamFeeReclaimed = true;
        ethicHubTeam.transfer(fee);
    }

    function returnBorrowedEth() payable public {
        require(state == LendingState.AwaitingReturn);
        require(borrowerReturnEthPerFiatRate > 0);
        require(msg.value == borrowerReturnAmount());
        state = LendingState.ContributionReturned;
        emit StateChange(uint(state));
        updateReputation();
    }

    // @notice Function to participate in contribution period
    //  Amounts from the same address should be added up
    //  If cap is reached, end time should be modified
    //  Funds should be transferred into multisig wallet
    // @param contributor Address
    function contributeWithAddress(address contributor) public payable checkProfileRegistered('investor') whenNotPaused {
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

        }
        if (investors[contributor].amount == 0) {
            investorCount = investorCount.add(1);
        }
        investors[contributor].amount = investors[contributor].amount.add(contribValue);

        if (excessContribValue > 0) {
            msg.sender.transfer(excessContribValue);
        }
        emit onContribution(newTotalContributed, contributor, contribValue, investorCount);
    }

    function sendFundsToBorrower() external onlyOwner {
      //Waiting for Exchange
        require(state == LendingState.AcceptingContributions);
        require(capReached);
        state = LendingState.ExchangingToFiat;
        emit StateChange(uint(state));
        borrower.transfer(totalContributed);
    }

    function updateReputation() internal {
        uint delayDays = getDelayDays(now);
        if (delayDays > 0) {
            ethicHubStorage.setUint(keccak256("lending.delayDays", this), delayDays);
            reputation.burnReputation(delayDays);
        } else {
            uint completedProjectsByTier  = ethicHubStorage.getUint(keccak256("community.completedProjectsByTier", this, tier)).add(1);
            ethicHubStorage.setUint(keccak256("community.completedProjectsByTier", this, tier), completedProjectsByTier);
            reputation.incrementReputation(completedProjectsByTier);
        }
    }

    function getDelayDays(uint date) public view returns(uint) {
        uint lendingDaysSeconds = lendingDays * 1 days;
        uint defaultTime = fundingEndTime.add(lendingDaysSeconds);
        if (date < defaultTime) {
            return 0;
        } else {
            return date.sub(defaultTime).div(60).div(60).div(24);
        }
    }

    // lendingInterestRate with 2 decimal
    // 15 * (lending days)/ 365 + 4% local node fee + 3% LendingDev fee
    function lendingInterestRatePercentage() public view returns(uint256){
        return annualInterest.mul(interestBaseUint).mul(lendingDays.add(getDelayDays(now))).div(365).add(localNodeFee.mul(interestBaseUint)).add(ethichubFee.mul(interestBaseUint)).add(interestBasePercent);
    }

    // lendingInterestRate with 2 decimal
    function investorInterest() public view returns(uint256){
        return annualInterest.mul(interestBaseUint).mul(lendingDays.add(getDelayDays(now))).div(365).add(interestBasePercent);
    }

    function borrowerReturnFiatAmount() public view returns(uint256){
        return totalLendingFiatAmount.mul(lendingInterestRatePercentage()).div(interestBasePercent);
    }

    function borrowerReturnAmount() public view returns(uint256){
        return borrowerReturnFiatAmount().div(borrowerReturnEthPerFiatRate);
    }

    function isContribPeriodRunning() public view returns(bool) {
        return fundingStartTime <= now && fundingEndTime > now && !capReached;
    }

    function checkInvestorContribution(address investor) public view returns(uint256){
        return investors[investor].amount;
    }
}
