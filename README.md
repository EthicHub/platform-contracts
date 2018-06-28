![alt text](https://storage.googleapis.com/general-material/banner3.png)

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

- Reasonable contract upgradeability (for our alpha project posting schedule)
- 

## EthicHubStorage

## The Lending contract

## Access control

## Reputation

## Hub

## License
[GPL V3](https://www.gnu.org/licenses/gpl-3.0.txt)
