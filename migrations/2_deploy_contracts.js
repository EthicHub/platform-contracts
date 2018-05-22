const web3_1_0 = require('web3');
const BigNumber = web3.BigNumber
const utils = web3_1_0.utils;

//const Lending = artifacts.require('Lending');
const storage = artifacts.require('./storage/EthicHubStorage.sol');
const cmc = artifacts.require('./EthicHubCMC.sol');
const reputation = artifacts.require('./reputation/EthicHubReputation.sol');
const userManager = artifacts.require('./user/EthicHubUser.sol');

// Deploy EthicHub network
module.exports = async (deployer, network) => {
    if (network !== 'ganache' && network !== 'development' && network !== 'develop') {
        console.log("Skipping deploying EthicHub in dev networks");
        return;
    }
    console.log("--> Deploying EthicHubStorage...");
    return deployer.deploy(storage).then(() => {
        //Contract management
        console.log("--> EthicHubStorage deployed");
        console.log("--> Deploying EthichubCMC...");
        return deployer.deploy(cmc, storage.address).then(() => {
            console.log("--> EthichubCMC deployed");

            return storage.deployed().then(async storageInstance => {
                //Give CMC access to storage
                console.log("--> Registering EthichubCMC in the network...");
                await storageInstance.setAddress(utils.soliditySha3("contract.address", cmc.address), cmc.address);
                console.log("--> EthichubCMC registered");
                //Deploy reputation
                console.log("--> Deploying EthicHubReputation...");
                return deployer.deploy(reputation, storage.address).then(() => {
                    console.log("--> EthicHubReputation deployed");
                    //Set deployed reputation's role in the network
                    return cmc.deployed().then(async cmcInstance => {
                        console.log("--> Registering EthicHubReputation in the network...");
                        await cmcInstance.upgradeContract(reputation.address,"reputation");
                        console.log("--> EthicHubReputation registered");
                        console.log("--> Deploying EthicHubUser...");
                        return deployer.deploy(userManager,storage.address).then(() => {
                            console.log("--> EthicHubUser deployed");
                            console.log("--> Registering EthicHubReputation in the network...");
                            return cmc.deployed().then(async cmcInstance => {
                                await cmcInstance.upgradeContract(userManager.address,"users");
                                console.log("--> EthicHubReputation registered");
                                console.log("--> EthicHub network ready");
                            });
                        });
                    });
                });
            });
        });
    });

};
