/*
    Test integration of the platform contracts.

    Copyright (C) 2018 EthicHub

    This file is part of platform contracts.

    This is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
'use strict';
const EthereumTx = require('ethereumjs-tx');
const BigNumber = web3.BigNumber
const should = require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()
const web3_1_0 = require('web3');
const utils = web3_1_0.utils;
const storage = artifacts.require('./storage/EthicHubStorage.sol');
const userManager = artifacts.require('./user/EthicHubUser.sol');
const lending = artifacts.require('./lending/EthicHubLending.sol');
//const lending = artifacts.require('./lending/EthicHubLending.sol');
// Default key pairs made by testrpc when using `truffle develop` CLI tool
// NEVER USE THESE KEYS OUTSIDE OF THE LOCAL TEST ENVIRONMENT
const privateKeys = [
  'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3',
  'ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f',
  '0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1',
  'c88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c',
  '388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418'
];

async function deployedContracts () {

    const instances = await Promise.all([
        storage.deployed(),
        userManager.deployed()
    ]);
    return instances;
}
const localNode = web3.eth.accounts[1];
const community = web3.eth.accounts[2];
const investor = web3.eth.accounts[3];
const teamEH = web3.eth.accounts[4];

contract('EthicHubUser', function() {
  let instances;
  let storageInstance;
  let userManagerInstance;
  let ownerUserManager;
  let web3Contract;
  before(async () => {
    instances = await deployedContracts();
    storageInstance = instances[0];
    userManagerInstance = instances[1];
    web3Contract = web3.eth.contract(userManagerInstance.abi).at(userManagerInstance.address);
    ownerUserManager = web3Contract._eth.coinbase;
  });
  it('should pass if contract are on storage contract', async function() {
    let userManagerContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.name", "users"));
    userManagerContractAddress.should.be.equal(userManagerInstance.address);
  });
  it('should register local node', async function() {
    await userManagerInstance.registerLocalNode(localNode);
    let registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode, 'localNode');
    registrationStatus.should.be.equal(true);
  });
  it('should register community', async function() {
    await userManagerInstance.registerCommunity(community);
    let registrationStatus = await userManagerInstance.viewRegistrationStatus(community, 'community');
    registrationStatus.should.be.equal(true);
  });
  it('should register investor', async function() {
    await userManagerInstance.registerInvestor(investor);
    let registrationStatus = await userManagerInstance.viewRegistrationStatus(investor, 'investor');
    registrationStatus.should.be.equal(true);
  });
});

//contract('EthicHubLending', function() {
//  let instances;
//  let storageInstance;
//  //let lendingInstance;
//  before(async () => {
//    instances = await deployedContracts();
//    storageInstance = instances[0];
//    lendingInstance = await lending.deployed(storageInstance.address);
//    //web3Contract = web3.eth.contract(lendingInstance.abi).at(lendingInstance.address);
//    //ownerLending = web3Contract._eth.coinbase;
//  });
//  it('should pass if contract are on storage contract', async function() {
//    let lendingContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.address", lending.address));
//    lendingContractAddress.should.be.equal(lending.address);
//  });
//});
/*
 * Call a smart contract function from any keyset in which the caller has the
 *     private and public keys.
 * @param {string} senderPublicKey Public key in key pair.
 * @param {string} senderPrivateKey Private key in key pair.
 * @param {string} contractAddress Address of Solidity contract.
 * @param {string} data Data from the function's `getData` in web3.js.
 * @param {number} value Number of Ethereum wei sent in the transaction.
 * @return {Promise}
 */
function rawTransaction(
  senderPublicKey,
  senderPrivateKey,
  contractAddress,
  data,
  value
) {
  return new Promise((resolve, reject) => {
    let key = new Buffer(senderPrivateKey, 'hex');
    let nonce = web3.toHex(web3.eth.getTransactionCount(senderPublicKey));
    let gasPrice = web3.eth.gasPrice;
    let gasPriceHex = web3.toHex(web3.eth.estimateGas({
      from: contractAddress
    }));
    let gasLimitHex = web3.toHex(5500000);
    let rawTx = {
        nonce: nonce,
        gasPrice: gasPriceHex,
        gasLimit: gasLimitHex,
        data: data,
        to: contractAddress,
        value: web3.toHex(value)
    };
    let tx = new EthereumTx(rawTx);
    tx.sign(key);
    let stx = '0x' + tx.serialize().toString('hex');
    web3.eth.sendRawTransaction(stx, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });
}
