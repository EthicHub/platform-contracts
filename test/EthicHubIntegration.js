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
import ether from './helpers/ether';
import {advanceBlock} from './helpers/advanceToBlock';
import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import EVMRevert from './helpers/EVMRevert';

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
const reputation = artifacts.require('./reputation/EthicHubReputation.sol');
const { spawnSync } = require( 'child_process' );
const fs = require('fs');

require('dotenv').config()

// Default key pairs made by testrpc when using `truffle develop` CLI tool
// NEVER USE THESE KEYS OUTSIDE OF THE LOCAL TEST ENVIRONMENT
const publicKeys = [
    '0x627306090abab3a6e1400e9345bc60c78a8bef57',
    '0xf17f52151ebef6c7334fad080c5704d77216b732',
    '0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef',
    '0x821aea9a577a9b44299b9c15c88cf3087f3b5544',
    '0x0d1d4e623d10f9fba5db95830f7d3839406c6af2',
    '0x2932b7a2355d6fecc4b5c0b6bd44cc31df247a2e',
    '0x2191ef87e392377ec08e7c08eb105ef5448eced5',
    '0x0f4f2ac550a1b4e2280d04c21cea7ebd822934b5',
    '0x6330a553fc93768f612722bb8c2ec78ac90b3bbc',
    '0x5aeda56215b167893e80b4fe645ba6d5bab767de'
]

const privateKeys = [
    'c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3',
    'ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f',
    '0dbbe8e4ae425a6d2687f1a7e3ba17bc98c673636790f1b8ad91193c05875ef1',
    'c88b703fb08cbea894b6aeff5a544fb92e78a18e19814cd85da83b71f772aa6c',
    '388c684f0ba1ef5017716adb5d21a053ea8e90277d0868337519f97bede61418',
    '659cbb0e2411a44db63778987b1e22153c086a95eb6b18bdf89de078917abc63',
    '82d052c865f5763aad42add438569276c00d3d88a2d062d36b2bae914d58b8c8',
    'aa3680d5d48a8283413f7a108367c7299ca73f553735860a87b08f39395618b7',
    '0f62d96d6675f32685bbdb8ac13cda7c23436f63efbb9d07700d8669ff12b7c4',
    '8d5366123cb560bb606379f90a0bfd4769eecc0557f1b362dcae9012b548b1e5'
];

function now() {
    return Math.round((new Date()).getTime() / 1000);
}

async function deployedContracts (debug = false) {

    // remove old .env
    fs.unlinkSync('.env')

    const truffle_migrate = spawnSync( 'node_modules/.bin/truffle', [ 'migrate', '--reset' ] );
    if (debug){
        console.log( `stderr: ${truffle_migrate.stderr.toString()}` );
        console.log( `stdout: ${truffle_migrate.stdout.toString()}` );
        console.log(process.env)
    }
}
const ownerTruffle = web3.eth.accounts[0];
const localNode1 = web3.eth.accounts[1];
const localNode2 = web3.eth.accounts[2];
const community = web3.eth.accounts[3];
const investor1 = web3.eth.accounts[4];
const investor2 = web3.eth.accounts[5];
const investor3 = web3.eth.accounts[6];
const teamEH = web3.eth.accounts[7];

contract('EthicHubUser', function() {
    let instances;
    let storageInstance;
    let userManagerInstance;
    let ownerUserManager;
    let web3Contract;
    before(async () => {
        await deployedContracts();
        storageInstance = storage.at(process.env.storage)
        userManagerInstance = userManager.at(process.env.user)
        web3Contract = web3.eth.contract(userManagerInstance.abi).at(userManagerInstance.address);
        ownerUserManager = web3Contract._eth.coinbase;
    });
    it('should pass if contract are on storage contract', async function() {
        let userManagerContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.name", "users"));
        userManagerContractAddress.should.be.equal(userManagerInstance.address);
    });
    it('should register local node', async function() {
        await userManagerInstance.registerLocalNode(localNode1);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode1, 'localNode');
        registrationStatus.should.be.equal(true);
    });
    it('should register community', async function() {
        await userManagerInstance.registerCommunity(community);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(community, 'community');
        registrationStatus.should.be.equal(true);
    });
    it('should register investor', async function() {
        await userManagerInstance.registerInvestor(investor1);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(investor1, 'investor');
        registrationStatus.should.be.equal(true);
    });
    it('change user status', async function() {
        await userManagerInstance.changeUserStatus(investor1, 'investor', false);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(investor1, 'investor');
        registrationStatus.should.be.equal(false);
        await userManagerInstance.changeUserStatus(investor1, 'investor', true);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(investor1, 'localNode');
        registrationStatus.should.be.equal(false);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(investor1, 'investor');
        registrationStatus.should.be.equal(true);
    });
    it('change users status', async function() {
        await userManagerInstance.changeUsersStatus([localNode1, localNode2],  'localNode', false);
        let registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode1, 'localNode');
        registrationStatus.should.be.equal(false);
        await userManagerInstance.changeUsersStatus([localNode1, localNode2], 'localNode', true);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode1, 'community');
        registrationStatus.should.be.equal(false);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode2, 'community');
        registrationStatus.should.be.equal(false);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode1, 'localNode');
        registrationStatus.should.be.equal(true);
        registrationStatus = await userManagerInstance.viewRegistrationStatus(localNode2, 'localNode');
        registrationStatus.should.be.equal(true);
    });
});

contract('EthicHubLending', function(accounts) {
    let instances;
    let storageInstance;
    let userManagerInstance;
    let lendingInstance;
    let ownerLending;
    let web3Contract;
    //TODO deployed() EthicHubLending
    before(async () => {
        //await deployedContracts();
        storageInstance = storage.at(process.env.storage)
        userManagerInstance = userManager.at(process.env.user)
        lendingInstance = lending.at(process.env.lending)
        web3Contract = web3.eth.contract(lendingInstance.abi).at(lendingInstance.address);
        ownerLending = web3Contract._eth.coinbase;
        console.log(ownerLending);
    });
    //before(async () => {
    //  instances = await deployedContracts();
    //  storageInstance = instances[0];
    //  lendingInstance = instances[2];
    //  //lendingInstance = await lending.deployed(storageInstance.address);
    //  //web3Contract = web3.eth.contract(lendingInstance.abi).at(lendingInstance.address);
    //  //ownerLending = web3Contract._eth.coinbase;
    //});
    // De momento con new, no se hacerlo de otra
    //before(async () => {
    //    instances = await deployedContracts();
    //    storageInstance = instances[0];
    //    userManagerInstance = instances[1];
    //    // Register community and localNode
    //    await userManagerInstance.registerCommunity(community);
    //    await userManagerInstance.registerLocalNode(localNode1);

    //    // Deployed lending contract
    //    lendingInstance = await lending.new(
    //        //Arguments
    //        latestTime() + duration.days(5),//_fundingStartTime
    //        latestTime() + duration.days(35),//_fundingEndTime
    //        ownerTruffle,//_borrower (community)
    //        115,//_lendingInterestRatePercentage
    //        ether(3),//_totalLendingAmount
    //        2,//_lendingDays
    //        storageInstance.address, //_storageAddress
    //        localNode1,//localNode
    //        teamEH//team
    //    );
    //    // Register contract on storage
    //    await storageInstance.setAddress(utils.soliditySha3("contract.address", lendingInstance.address), lendingInstance.address);
    //    // owner of Lending contract
    //    web3Contract = web3.eth.contract(lendingInstance.abi).at(lendingInstance.address);
    //    ownerLending = web3Contract._eth.coinbase;
    //    ownerLending.should.be.equal(ownerTruffle);
    //});
    it('should pass if contract are on storage contract', async function() {
        let lendingContractAddress = await storageInstance.getAddress(utils.soliditySha3("contract.address", lendingInstance.address));
        lendingContractAddress.should.be.equal(lendingInstance.address);
    });
    describe('The investment reaches the local node', function() {
        it('investment reaches goal', async function() {
            await increaseTimeTo(latestTime() + duration.days(10));
            const investment1 = ether(2);
            const investment2 = ether(1);
            const investment3 = ether(1.5);

            const investor1InitialBalance = await web3.eth.getBalance(investor1);
            const investor2InitialBalance = await web3.eth.getBalance(investor2);
            const investor3InitialBalance = await web3.eth.getBalance(investor3);

            // Register the invetors
            await userManagerInstance.registerInvestor(investor1);
            await userManagerInstance.registerInvestor(investor2);
            await userManagerInstance.registerInvestor(investor3);

            // Is contribution period
            var isRunning = await lendingInstance.isContribPeriodRunning();
            isRunning.should.be.equal(true);


           // //Raw transaction
           await rawTransaction(investor1, 'bf088ed5814b00fd83558adb7127f9fcc71bb507b74d2c61b43a058a7c85b225', lendingInstance.address, '', investment1).should.be.fulfilled;
           // //Send transaction
           //await lendingInstance.sendTransaction({value: investment1, from: investor1}).should.be.fulfilled;
           //await lendingInstance.sendTransaction({value: investment2, from: investor2}).should.be.fulfilled;
           // await lendingInstance.sendTransaction({value: investment3, from: investor3}).should.be.rejectedWith(EVMRevert);
           // // Finish Period
           // await lendingInstance.finishInitialExchangingPeriod(this.initialEthPerFiatRate, {from: ownerLending}).should.be.fulfilled;
           // await lendingInstance.setBorrowerReturnEthPerFiatRate(this.finalEthPerFiatRate, {from: ownerLending}).should.be.fulfilled;
           // // Return amount
           // const borrowerReturnAmount = await lendingInstance.borrowerReturnAmount();
           // console.log("borrowerReturnAmount: " + utils.fromWei(utils.toBN(borrowerReturnAmount)));
        });
    });
});
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
