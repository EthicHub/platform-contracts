#!/bin/bash
SCRIPT_PATH="./scripts/test.sh"


mainmenu () {
  echo "-> Insert number of test suite:"
  echo "1 - EthicHubLending"
  echo "2 - EthicHubReputation"
  echo "3 - EthicHubBase"
  echo "4 - EthicHubUser"
  echo "x - exit program"

  read  -n 1 -p "Input Selection:" mainmenuinput
  echo ""
  if [ "$mainmenuinput" = "1" ]; then
            bash $SCRIPT_PATH test/EthicHubLending.js ./test/helper_contracts/MockStorage.sol ./test/helper_contracts/MockReputation.sol
        elif [ "$mainmenuinput" = "2" ]; then
            bash $SCRIPT_PATH test/EthicHubReputation.js  ./test/helper_contracts/MockStorage.sol 
        elif [ "$mainmenuinput" = "3" ]; then
            bash $SCRIPT_PATH test test/EthicHubBase.js ./test/helper_contracts/MockStorage.sol ./test/helper_contracts/MockEthicHubContract.sol 
        elif [ "$mainmenuinput" = "4" ]; then
            bash $SCRIPT_PATH  test test/EthicHubUser.js 
        elif [ "$mainmenuinput" = "5" ]; then
            bash $SCRIPT_PATH test/FixedPoolWithBonusTokenDistribution.js test/helpers/FixedPoolWithBonusTokenDistributionMock.sol
        elif [ "$mainmenuinput" = "x" ];then
            exit 0
        else
            echo "You have entered an invallid selection!"
            echo "Please try again!"
            echo ""
            echo "Press any key to continue..."
            read -n 1
            clear
            mainmenu
        fi
}

mainmenu
