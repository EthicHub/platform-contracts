![EthicHub Logo](https://storage.googleapis.com/general-material/banner3.png)

# :warning: :warning: :rocket: :rocket: ATTENTION :rocket: :rocket: :warning: :warning:

We moved our repos to Gitlab. This repo is not going to be updated. If you want to see the work continue, contribute, learn... [Come with us there](https://gitlab.com/EthicHub/platform-contracts.git)!

# EthicHub Alpha Contracts
The backbone of EthicHub's Ethical Crowdlending Platform.

Developed with [Truffle Framework](https://truffleframework.com/)

## Install
```
git clone https://github.com/EthicHub/platform-contracts
cd platform-contracts
npm install
```
## Tests

```
truffle develop
test
```
Since the integration tests and some unit tests are ether intensive, repetitive runs of the whole suit could deplete the test ether. As an alternative:

### All tests in TestRPC with more Eth preloaded
Run:
```
./scripts/test.sh
```
### Individual test suite

Run:
```
./scripts/individual_test.sh
```
and follow the console instructions to run one test suite

# Architecture
Inspired by [RocketPool's Hub&Spoke architecture](https://medium.com/rocket-pool/upgradable-solidity-contract-design-54789205276d), we use a network of contracts that will allow us to have:

- Reasonable contract upgradeability (for our alpha's project posting schedule)
- Persistent data storage between contract updates
- Flexible role based access control
- [K.I.S.S](https://en.wikipedia.org/wiki/KISS_principle)

![EthicHub contract architecture ](https://storage.googleapis.com/general-material/alpha_contracts_architecture.png)

## [Storage](./contracts/storage/EthicHubStorage.sol)

Simple contract with mappings for each type, for key value storage. We obtain unique keys combining dot notation tags and related parameters using keccak256.

All the contracts of the network descend from [EthicHubBase](./contracts/EthicHubBase.sol), so they will have a reference to the storage contract.

To read data, they do:
```
ethicHubStorage.get<Type>(keccak256("dot.notation.tag", parameter)
```

Storing and deleting data works in a similar fashion:
```
ethicHubStorage.set<Type>(keccak256("dot.notation.tag", parameter)
ethicHubStorage.delete<Type>(keccak256("dot.notation.tag", parameter)
```

Howhever, only contracts registered in EthicHub's network (i.e. their address is saved in storage in a key corresponding to keccak256("contract.address", the_address) ) are allowed to set and delete
```
modifier onlyEthicHubContracts() {
    // Make sure the access is permitted to only contracts in our Dapp
    require(addressStorage[keccak256("contract.address", msg.sender)] != 0x0);
    _;
}
```

## [CMC](./contracts/EthicHubCMC.sol)

The Contract Manager Contract (CMC) function is to register new versions of deployed contracts in storage, granting them write and delete access.

Except for the lending contracts, the rest of the "logic" contracts are singletons, so upgrading a contract's version will remove the previous one from storage, revoking it's ability to modify it.

## [User Manager](./contracts/user/EthicHubUser.sol)

This contract allows us to give permissions to user's wallet based on their roles (saving their address in the address mapping `            ethicHubStorage.setBool(keccak256("user", "<role>", target_address), true);
`)

The roles we have are:
#### Community
Addresses that will track the reputation of a community

#### Investor
To be compliant, we cannot receive contributions from addresses whose owner has not passed a KYC/AML check. To control this, we must implement an access control mechanism.

#### Local node
The project promoter, selector and auditor


## [Reputation](./contracts/reputation/EthicHubReputation.sol)
Updates reputation score of the project's Local Node and Community.

For more in depth explanation, [read this article](https://medium.com/ethichub/reputation-and-scoring-in-ethichub-c06133f9730f).


## Lending contracts

Each lending contracts corresponds to a project. Holds the logic for the crowdlending, return of the funds and distribution to the lenders.

The simplified state machine is:

![EthicHub Lending state machine](https://storage.googleapis.com/general-material/simplified_lending_state_machine.png)

Lenders, borrowers and local nodes interact with these contracts through [EthicHub's Platform](https://mvp.ethichub.com).






## License
[GPL V3](https://www.gnu.org/licenses/gpl-3.0.txt)
