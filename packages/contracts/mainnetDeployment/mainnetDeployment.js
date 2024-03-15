const { UniswapV2Factory } = require("./ABIs/UniswapV2Factory.js")
const { UniswapV2Pair } = require("./ABIs/UniswapV2Pair.js")
const { UniswapV2Router02 } = require("./ABIs/UniswapV2Router02.js")
const { ChainlinkAggregatorV3Interface } = require("./ABIs/ChainlinkAggregatorV3Interface.js")
const { TestHelper: th, TimeValues: timeVals } = require("../utils/testHelpers.js")
const { dec } = th
const MainnetDeploymentHelper = require("../utils/mainnetDeploymentHelpers.js")
const toBigNum = ethers.BigNumber.from

async function mainnetDeploy(configParams) {
  const date = new Date()
  console.log(date.toUTCString())
  const deployerWallet = (await ethers.getSigners())[0]
  // const account2Wallet = (await ethers.getSigners())[1]
  const mdh = new MainnetDeploymentHelper(configParams, deployerWallet)
  const gasPrice = configParams.GAS_PRICE

  const deploymentState = mdh.loadPreviousDeployment()

  console.log(`deployer address: ${deployerWallet.address}`)
  assert.equal(deployerWallet.address, configParams.beraborrowAddrs.DEPLOYER)
  // assert.equal(account2Wallet.address, configParams.beneficiaries.ACCOUNT_2)
  let deployeriBGTBalance = await ethers.provider.getBalance(deployerWallet.address)
  console.log(`deployeriBGTBalance before: ${deployeriBGTBalance}`)

  // Get UniswapV2Factory instance at its deployed address
  const uniswapV2Factory = new ethers.Contract(
    configParams.externalAddrs.UNISWAP_V2_FACTORY,
    UniswapV2Factory.abi,
    deployerWallet
  )

  console.log(`Uniswp addr: ${uniswapV2Factory.address}`)
  const uniAllPairsLength = await uniswapV2Factory.allPairsLength()
  console.log(`Uniswap Factory number of pairs: ${uniAllPairsLength}`)

  deployeriBGTBalance = await ethers.provider.getBalance(deployerWallet.address)
  console.log(`deployer's iBGT balance before deployments: ${deployeriBGTBalance}`)

  // Deploy core logic contracts
  const beraborrowCore = await mdh.deployBeraBorrowCoreMainnet(configParams.externalAddrs.TELLOR_MASTER, deploymentState)
  await mdh.logContractObjects(beraborrowCore)

  // Check Uniswap Pair NECT-iBGT pair before pair creation
  let NECTiBGTPairAddr = await uniswapV2Factory.getPair(beraborrowCore.nectToken.address, configParams.externalAddrs.iBGT_ERC20)
  let iBGTNECTPairAddr = await uniswapV2Factory.getPair(configParams.externalAddrs.iBGT_ERC20, beraborrowCore.nectToken.address)
  console.log ("**********************", NECTiBGTPairAddr)
  assert.equal(NECTiBGTPairAddr, iBGTNECTPairAddr)


  if (NECTiBGTPairAddr == th.ZERO_ADDRESS) {
    // Deploy Unipool for NECT-iBGT
    await mdh.sendAndWaitForTransaction(uniswapV2Factory.createPair(
      configParams.externalAddrs.iBGT_ERC20,
      beraborrowCore.nectToken.address,
      { gasPrice }
    ))

    // Check Uniswap Pair NECT-iBGT pair after pair creation (forwards and backwards should have same address)
    NECTiBGTPairAddr = await uniswapV2Factory.getPair(beraborrowCore.nectToken.address, configParams.externalAddrs.iBGT_ERC20)
    assert.notEqual(NECTiBGTPairAddr, th.ZERO_ADDRESS)
    iBGTNECTPairAddr = await uniswapV2Factory.getPair(configParams.externalAddrs.iBGT_ERC20, beraborrowCore.nectToken.address)
    console.log(`NECT-iBGT pair contract address after Uniswap pair creation: ${NECTiBGTPairAddr}`)
    assert.equal(iBGTNECTPairAddr, NECTiBGTPairAddr)
  }

  // Deploy Unipool
  const unipool = await mdh.deployUnipoolMainnet(deploymentState)

  // Deploy POLLEN Contracts
  const POLLENContracts = await mdh.deployPOLLENContractsMainnet(
    configParams.beraborrowAddrs.GENERAL_SAFE, // bounty address
    unipool.address,  // lp rewards address
    configParams.beraborrowAddrs.POLLEN_SAFE, // multisig POLLEN endowment address
    deploymentState,
  )

  // Connect all core contracts up
  await mdh.connectCoreContractsMainnet(beraborrowCore, POLLENContracts, configParams.externalAddrs.CHAINLINK_iBGTUSD_PROXY)
  await mdh.connectPOLLENContractsMainnet(POLLENContracts)
  await mdh.connectPOLLENContractsToCoreMainnet(POLLENContracts, beraborrowCore)

  // Deploy a read-only multi-trove getter
  const multiTroveGetter = await mdh.deployMultiTroveGetterMainnet(beraborrowCore, deploymentState)

  // Connect Unipool to POLLENToken and the NECT-iBGT pair address, with a 6 week duration
  const LPRewardsDuration = timeVals.SECONDS_IN_SIX_WEEKS
  await mdh.connectUnipoolMainnet(unipool, POLLENContracts, NECTiBGTPairAddr, LPRewardsDuration)

  // Log POLLEN and Unipool addresses
  await mdh.logContractObjects(POLLENContracts)
  console.log(`Unipool address: ${unipool.address}`)
  
  // let latestBlock = await ethers.provider.getBlockNumber()
  let deploymentStartTime = await POLLENContracts.pollenToken.getDeploymentStartTime()

  console.log(`deployment start time: ${deploymentStartTime}`)
  const oneYearFromDeployment = (Number(deploymentStartTime) + timeVals.SECONDS_IN_ONE_YEAR).toString()
  console.log(`time oneYearFromDeployment: ${oneYearFromDeployment}`)

  // Deploy LockupContracts - one for each beneficiary
  const lockupContracts = {}

  for (const [investor, investorAddr] of Object.entries(configParams.beneficiaries)) {
    const lockupContractEthersFactory = await ethers.getContractFactory("LockupContract", deployerWallet)
    if (deploymentState[investor] && deploymentState[investor].address) {
      console.log(`Using previously deployed ${investor} lockup contract at address ${deploymentState[investor].address}`)
      lockupContracts[investor] = new ethers.Contract(
        deploymentState[investor].address,
        lockupContractEthersFactory.interface,
        deployerWallet
      )
    } else {
      const txReceipt = await mdh.sendAndWaitForTransaction(POLLENContracts.lockupContractFactory.deployLockupContract(investorAddr, oneYearFromDeployment, { gasPrice }))

      const address = await txReceipt.logs[0].address // The deployment event emitted from the LC itself is is the first of two events, so this is its address 
      lockupContracts[investor] = new ethers.Contract(
        address,
        lockupContractEthersFactory.interface,
        deployerWallet
      )

      deploymentState[investor] = {
        address: address,
        txHash: txReceipt.transactionHash
      }

      mdh.saveDeployment(deploymentState)
    }

    const pollenTokenAddr = POLLENContracts.pollenToken.address
    // verify
    if (configParams.BERASCAN_BASE_URL) {
      await mdh.verifyContract(investor, deploymentState, [pollenTokenAddr, investorAddr, oneYearFromDeployment])
    }
  }

  // // --- TESTS AND CHECKS  ---

  // Deployer repay NECT
  // console.log(`deployer trove debt before repaying: ${await beraborrowCore.troveManager.getTroveDebt(deployerWallet.address)}`)
 // await mdh.sendAndWaitForTransaction(beraborrowCore.borrowerOperations.repayNECT(dec(800, 18), th.ZERO_ADDRESS, th.ZERO_ADDRESS, {gasPrice, gasLimit: 1000000}))
  // console.log(`deployer trove debt after repaying: ${await beraborrowCore.troveManager.getTroveDebt(deployerWallet.address)}`)
  
  // Deployer add coll
  // console.log(`deployer trove coll before adding coll: ${await beraborrowCore.troveManager.getTroveColl(deployerWallet.address)}`)
  // await mdh.sendAndWaitForTransaction(beraborrowCore.borrowerOperations.addColl(th.ZERO_ADDRESS, th.ZERO_ADDRESS, {value: dec(2, 'ether'), gasPrice, gasLimit: 1000000}))
  // console.log(`deployer trove coll after addingColl: ${await beraborrowCore.troveManager.getTroveColl(deployerWallet.address)}`)
  
  // Check chainlink proxy price ---

  const chainlinkProxy = new ethers.Contract(
    configParams.externalAddrs.CHAINLINK_iBGTUSD_PROXY,
    ChainlinkAggregatorV3Interface,
    deployerWallet
  )

  // Get latest price
  let chainlinkPrice = await chainlinkProxy.latestAnswer()
  console.log(`current Chainlink price: ${chainlinkPrice}`)

  // Check Tellor price directly (through our TellorCaller)
  let tellorPriceResponse = await beraborrowCore.tellorCaller.getTellorCurrentValue(1) // id == 1: the iBGT-USD request ID
  console.log(`current Tellor price: ${tellorPriceResponse[1]}`)
  console.log(`current Tellor timestamp: ${tellorPriceResponse[2]}`)

  // // --- Lockup Contracts ---
  console.log("LOCKUP CONTRACT CHECKS")
  // Check lockup contracts exist for each beneficiary with correct unlock time
  for (investor of Object.keys(lockupContracts)) {
    const lockupContract = lockupContracts[investor]
    // check LC references correct POLLENToken 
    const storedPOLLENTokenAddr = await lockupContract.pollenToken()
    assert.equal(POLLENContracts.pollenToken.address, storedPOLLENTokenAddr)
    // Check contract has stored correct beneficary
    const onChainBeneficiary = await lockupContract.beneficiary()
    assert.equal(configParams.beneficiaries[investor].toLowerCase(), onChainBeneficiary.toLowerCase())
    // Check correct unlock time (1 yr from deployment)
    const unlockTime = await lockupContract.unlockTime()
    assert.equal(oneYearFromDeployment, unlockTime)

    console.log(
      `lockupContract addr: ${lockupContract.address},
            stored POLLENToken addr: ${storedPOLLENTokenAddr}
            beneficiary: ${investor},
            beneficiary addr: ${configParams.beneficiaries[investor]},
            on-chain beneficiary addr: ${onChainBeneficiary},
            unlockTime: ${unlockTime}
            `
    )
  }

  // // --- Check correct addresses set in POLLENToken
  // console.log("STORED ADDRESSES IN POLLEN TOKEN")
  // const storedMultisigAddress = await POLLENContracts.pollenToken.multisigAddress()
  // assert.equal(configParams.beraborrowAddrs.POLLEN_SAFE.toLowerCase(), storedMultisigAddress.toLowerCase())
  // console.log(`multi-sig address stored in POLLENToken : ${th.squeezeAddr(storedMultisigAddress)}`)
  // console.log(`POLLEN Safe address: ${th.squeezeAddr(configParams.beraborrowAddrs.POLLEN_SAFE)}`)

  // // --- POLLEN allowances of different addresses ---
  // console.log("INITIAL POLLEN BALANCES")
  // // Unipool
  // const unipoolPOLLENBal = await POLLENContracts.pollenToken.balanceOf(unipool.address)
  // // assert.equal(unipoolPOLLENBal.toString(), '1333333333333333333333333')
  // th.logBN('Unipool POLLEN balance       ', unipoolPOLLENBal)

  // // POLLEN Safe
  // const pollenSafeBal = await POLLENContracts.pollenToken.balanceOf(configParams.beraborrowAddrs.POLLEN_SAFE)
  // assert.equal(pollenSafeBal.toString(), '64666666666666666666666667')
  // th.logBN('POLLEN Safe balance     ', pollenSafeBal)

  // // Bounties/hackathons (General Safe)
  // const generalSafeBal = await POLLENContracts.pollenToken.balanceOf(configParams.beraborrowAddrs.GENERAL_SAFE)
  // assert.equal(generalSafeBal.toString(), '2000000000000000000000000')
  // th.logBN('General Safe balance       ', generalSafeBal)

  // // CommunityIssuance contract
  // const communityIssuanceBal = await POLLENContracts.pollenToken.balanceOf(POLLENContracts.communityIssuance.address)
  // // assert.equal(communityIssuanceBal.toString(), '32000000000000000000000000')
  // th.logBN('Community Issuance balance', communityIssuanceBal)

  // // --- PriceFeed ---
  // console.log("PRICEFEED CHECKS")
  // // Check Pricefeed's status and last good price
  // const lastGoodPrice = await beraborrowCore.priceFeed.lastGoodPrice()
  // const priceFeedInitialStatus = await beraborrowCore.priceFeed.status()
  // th.logBN('PriceFeed first stored price', lastGoodPrice)
  // console.log(`PriceFeed initial status: ${priceFeedInitialStatus}`)

  // // Check PriceFeed's & TellorCaller's stored addresses
  // const priceFeedCLAddress = await beraborrowCore.priceFeed.priceAggregator()
  // const priceFeedTellorCallerAddress = await beraborrowCore.priceFeed.tellorCaller()
  // assert.equal(priceFeedCLAddress, configParams.externalAddrs.CHAINLINK_iBGTUSD_PROXY)
  // assert.equal(priceFeedTellorCallerAddress, beraborrowCore.tellorCaller.address)

  // // Check Tellor address
  // const tellorCallerTellorMasterAddress = await beraborrowCore.tellorCaller.tellor()
  // assert.equal(tellorCallerTellorMasterAddress, configParams.externalAddrs.TELLOR_MASTER)

  // // --- Unipool ---

  // // Check Unipool's NECT-iBGT Uniswap Pair address
  // const unipoolUniswapPairAddr = await unipool.uniToken()
  // console.log(`Unipool's stored NECT-iBGT Uniswap Pair address: ${unipoolUniswapPairAddr}`)

  // console.log("SYSTEM GLOBAL VARS CHECKS")
  // // --- Sorted Troves ---

  // // Check max size
  // const sortedTrovesMaxSize = (await beraborrowCore.sortedTroves.data())[2]
  // assert.equal(sortedTrovesMaxSize, '115792089237316195423570985008687907853269984665640564039457584007913129639935')

  // // --- TroveManager ---

  // const liqReserve = await beraborrowCore.troveManager.NECT_GAS_COMPENSATION()
  // const minNetDebt = await beraborrowCore.troveManager.MIN_NET_DEBT()

  // th.logBN('system liquidation reserve', liqReserve)
  // th.logBN('system min net debt      ', minNetDebt)

  // // --- Make first NECT-iBGT liquidity provision ---

  // // Open trove if not yet opened
  // const troveStatus = await beraborrowCore.troveManager.getTroveStatus(deployerWallet.address)
  // if (troveStatus.toString() != '1') {
  //   let _3kNECTWithdrawal = th.dec(3000, 18) // 3000 NECT
  //   let _3iBGTcoll = th.dec(3, 'ether') // 3 iBGT
  //   console.log('Opening trove...')
  //   await mdh.sendAndWaitForTransaction(
  //     beraborrowCore.borrowerOperations.openTrove(
  //       th._100pct,
  //       _3kNECTWithdrawal,
  //       th.ZERO_ADDRESS,
  //       th.ZERO_ADDRESS,
  //       { value: _3iBGTcoll, gasPrice }
  //     )
  //   )
  // } else {
  //   console.log('Deployer already has an active trove')
  // }

  // // Check deployer now has an open trove
  // console.log(`deployer is in sorted list after making trove: ${await beraborrowCore.sortedTroves.contains(deployerWallet.address)}`)

  // const deployerTrove = await beraborrowCore.troveManager.Troves(deployerWallet.address)
  // th.logBN('deployer debt', deployerTrove[0])
  // th.logBN('deployer coll', deployerTrove[1])
  // th.logBN('deployer stake', deployerTrove[2])
  // console.log(`deployer's trove status: ${deployerTrove[3]}`)

  // // Check deployer has NECT
  // let deployerNECTBal = await beraborrowCore.nectToken.balanceOf(deployerWallet.address)
  // th.logBN("deployer's NECT balance", deployerNECTBal)

  // // Check Uniswap pool has NECT and iBGT tokens
  const NECTiBGTPair = await new ethers.Contract(
    NECTiBGTPairAddr,
    UniswapV2Pair.abi,
    deployerWallet
  )

  // const token0Addr = await NECTiBGTPair.token0()
  // const token1Addr = await NECTiBGTPair.token1()
  // console.log(`NECT-iBGT Pair token 0: ${th.squeezeAddr(token0Addr)},
  //       NECTToken contract addr: ${th.squeezeAddr(beraborrowCore.nectToken.address)}`)
  // console.log(`NECT-iBGT Pair token 1: ${th.squeezeAddr(token1Addr)},
  //       iBGT ERC20 contract addr: ${th.squeezeAddr(configParams.externalAddrs.iBGT_ERC20)}`)

  // // Check initial NECT-iBGT pair reserves before provision
  // let reserves = await NECTiBGTPair.getReserves()
  // th.logBN("NECT-iBGT Pair's NECT reserves before provision", reserves[0])
  // th.logBN("NECT-iBGT Pair's iBGT reserves before provision", reserves[1])

  // // Get the UniswapV2Router contract
  // const uniswapV2Router02 = new ethers.Contract(
  //   configParams.externalAddrs.UNISWAP_V2_ROUTER02,
  //   UniswapV2Router02.abi,
  //   deployerWallet
  // )

  // // --- Provide liquidity to NECT-iBGT pair if not yet done so ---
  // let deployerLPTokenBal = await NECTiBGTPair.balanceOf(deployerWallet.address)
  // if (deployerLPTokenBal.toString() == '0') {
  //   console.log('Providing liquidity to Uniswap...')
  //   // Give router an allowance for NECT
  //   await beraborrowCore.nectToken.increaseAllowance(uniswapV2Router02.address, dec(10000, 18))

  //   // Check Router's spending allowance
  //   const routerNECTAllowanceFromDeployer = await beraborrowCore.nectToken.allowance(deployerWallet.address, uniswapV2Router02.address)
  //   th.logBN("router's spending allowance for deployer's NECT", routerNECTAllowanceFromDeployer)

  //   // Get amounts for liquidity provision
  //   const LP_iBGT = dec(1, 'ether')

  //   // Convert 8-digit CL price to 18 and multiply by iBGT amount
  //   const NECTAmount = toBigNum(chainlinkPrice)
  //     .mul(toBigNum(dec(1, 10)))
  //     .mul(toBigNum(LP_iBGT))
  //     .div(toBigNum(dec(1, 18)))

  //   const minNECTAmount = NECTAmount.sub(toBigNum(dec(100, 18)))

  //   latestBlock = await ethers.provider.getBlockNumber()
  //   now = (await ethers.provider.getBlock(latestBlock)).timestamp
  //   let tenMinsFromNow = now + (60 * 60 * 10)

  //   // Provide liquidity to NECT-iBGT pair
  //   await mdh.sendAndWaitForTransaction(
  //     uniswapV2Router02.addLiquidityiBGT(
  //       beraborrowCore.nectToken.address, // address of NECT token
  //       NECTAmount, // NECT provision
  //       minNECTAmount, // minimum NECT provision
  //       LP_iBGT, // minimum iBGT provision
  //       deployerWallet.address, // address to send LP tokens to
  //       tenMinsFromNow, // deadline for this tx
  //       {
  //         value: dec(1, 'ether'),
  //         gasPrice,
  //         gasLimit: 5000000 // For some reason, ethers can't estimate gas for this tx
  //       }
  //     )
  //   )
  // } else {
  //   console.log('Liquidity already provided to Uniswap')
  // }
  // // Check NECT-iBGT reserves after liquidity provision:
  // reserves = await NECTiBGTPair.getReserves()
  // th.logBN("NECT-iBGT Pair's NECT reserves after provision", reserves[0])
  // th.logBN("NECT-iBGT Pair's iBGT reserves after provision", reserves[1])



  // // ---  Check LP staking  ---
  // console.log("CHECK LP STAKING EARNS POLLEN")

  // // Check deployer's LP tokens
  // deployerLPTokenBal = await NECTiBGTPair.balanceOf(deployerWallet.address)
  // th.logBN("deployer's LP token balance", deployerLPTokenBal)

  // // Stake LP tokens in Unipool
  // console.log(`NECTiBGTPair addr: ${NECTiBGTPair.address}`)
  // console.log(`Pair addr stored in Unipool: ${await unipool.uniToken()}`)

  // earnedPOLLEN = await unipool.earned(deployerWallet.address)
  // th.logBN("deployer's farmed POLLEN before staking LP tokens", earnedPOLLEN)

  // const deployerUnipoolStake = await unipool.balanceOf(deployerWallet.address)
  // if (deployerUnipoolStake.toString() == '0') {
  //   console.log('Staking to Unipool...')
  //   // Deployer approves Unipool
  //   await mdh.sendAndWaitForTransaction(
  //     NECTiBGTPair.approve(unipool.address, deployerLPTokenBal, { gasPrice })
  //   )

  //   await mdh.sendAndWaitForTransaction(unipool.stake(1, { gasPrice }))
  // } else {
  //   console.log('Already staked in Unipool')
  // }

  // console.log("wait 90 seconds before checking earnings... ")
  // await configParams.waitFunction()

  // earnedPOLLEN = await unipool.earned(deployerWallet.address)
  // th.logBN("deployer's farmed POLLEN from Unipool after waiting ~1.5mins", earnedPOLLEN)

  // let deployerPOLLENBal = await POLLENContracts.pollenToken.balanceOf(deployerWallet.address)
  // th.logBN("deployer POLLEN Balance Before SP deposit", deployerPOLLENBal)



  // // --- Make SP deposit and earn POLLEN ---
  // console.log("CHECK DEPLOYER MAKING DEPOSIT AND EARNING POLLEN")

  // let SPDeposit = await beraborrowCore.stabilityPool.getCompoundedNECTDeposit(deployerWallet.address)
  // th.logBN("deployer SP deposit before making deposit", SPDeposit)

  // // Provide to SP
  // await mdh.sendAndWaitForTransaction(beraborrowCore.stabilityPool.provideToSP(dec(15, 18), th.ZERO_ADDRESS, { gasPrice, gasLimit: 400000 }))

  // // Get SP deposit 
  // SPDeposit = await beraborrowCore.stabilityPool.getCompoundedNECTDeposit(deployerWallet.address)
  // th.logBN("deployer SP deposit after depositing 15 NECT", SPDeposit)

  // console.log("wait 90 seconds before withdrawing...")
  // // wait 90 seconds
  // await configParams.waitFunction()

  // // Withdraw from SP
  // // await mdh.sendAndWaitForTransaction(beraborrowCore.stabilityPool.withdrawFromSP(dec(1000, 18), { gasPrice, gasLimit: 400000 }))

  // // SPDeposit = await beraborrowCore.stabilityPool.getCompoundedNECTDeposit(deployerWallet.address)
  // // th.logBN("deployer SP deposit after full withdrawal", SPDeposit)

  // // deployerPOLLENBal = await POLLENContracts.pollenToken.balanceOf(deployerWallet.address)
  // // th.logBN("deployer POLLEN Balance after SP deposit withdrawal", deployerPOLLENBal)



  // // ---  Attempt withdrawal from LC  ---
  // console.log("CHECK BENEFICIARY ATTEMPTING WITHDRAWAL FROM LC")

  // // connect Acct2 wallet to the LC they are beneficiary of
  // let account2LockupContract = await lockupContracts["ACCOUNT_2"].connect(account2Wallet)

  // // Deployer funds LC with 10 POLLEN
  // // await mdh.sendAndWaitForTransaction(POLLENContracts.pollenToken.transfer(account2LockupContract.address, dec(10, 18), { gasPrice }))

  // // account2 POLLEN bal
  // let account2bal = await POLLENContracts.pollenToken.balanceOf(account2Wallet.address)
  // th.logBN("account2 POLLEN bal before withdrawal attempt", account2bal)

  // // Check LC POLLEN bal 
  // let account2LockupContractBal = await POLLENContracts.pollenToken.balanceOf(account2LockupContract.address)
  // th.logBN("account2's LC POLLEN bal before withdrawal attempt", account2LockupContractBal)

  // // Acct2 attempts withdrawal from  LC
  // await mdh.sendAndWaitForTransaction(account2LockupContract.withdrawPOLLEN({ gasPrice, gasLimit: 1000000 }))

  // // Acct POLLEN bal
  // account2bal = await POLLENContracts.pollenToken.balanceOf(account2Wallet.address)
  // th.logBN("account2's POLLEN bal after LC withdrawal attempt", account2bal)

  // // Check LC bal 
  // account2LockupContractBal = await POLLENContracts.pollenToken.balanceOf(account2LockupContract.address)
  // th.logBN("account2's LC POLLEN bal LC withdrawal attempt", account2LockupContractBal)

  // // --- Stake POLLEN ---
  // console.log("CHECK DEPLOYER STAKING POLLEN")

  // // Log deployer POLLEN bal and stake before staking
  // deployerPOLLENBal = await POLLENContracts.pollenToken.balanceOf(deployerWallet.address)
  // th.logBN("deployer POLLEN bal before staking", deployerPOLLENBal)
  // let deployerPOLLENStake = await POLLENContracts.pollenStaking.stakes(deployerWallet.address)
  // th.logBN("deployer stake before staking", deployerPOLLENStake)

  // // stake 13 POLLEN
  // await mdh.sendAndWaitForTransaction(POLLENContracts.pollenStaking.stake(dec(13, 18), { gasPrice, gasLimit: 1000000 }))

  // // Log deployer POLLEN bal and stake after staking
  // deployerPOLLENBal = await POLLENContracts.pollenToken.balanceOf(deployerWallet.address)
  // th.logBN("deployer POLLEN bal after staking", deployerPOLLENBal)
  // deployerPOLLENStake = await POLLENContracts.pollenStaking.stakes(deployerWallet.address)
  // th.logBN("deployer stake after staking", deployerPOLLENStake)

  // // Log deployer rev share immediately after staking
  // let deployerNECTRevShare = await POLLENContracts.pollenStaking.getPendingNECTGain(deployerWallet.address)
  // th.logBN("deployer pending NECT revenue share", deployerNECTRevShare)



  // // --- 2nd Account opens trove ---
  // const trove2Status = await beraborrowCore.troveManager.getTroveStatus(account2Wallet.address)
  // if (trove2Status.toString() != '1') {
  //   console.log("Acct 2 opens a trove ...")
  //   let _2kNECTWithdrawal = th.dec(2000, 18) // 2000 NECT
  //   let _1pt5_iBGTcoll = th.dec(15, 17) // 1.5 iBGT
  //   const borrowerOpsEthersFactory = await ethers.getContractFactory("BorrowerOperations", account2Wallet)
  //   const borrowerOpsAcct2 = await new ethers.Contract(beraborrowCore.borrowerOperations.address, borrowerOpsEthersFactory.interface, account2Wallet)

  //   await mdh.sendAndWaitForTransaction(borrowerOpsAcct2.openTrove(th._100pct, _2kNECTWithdrawal, th.ZERO_ADDRESS, th.ZERO_ADDRESS, { value: _1pt5_iBGTcoll, gasPrice, gasLimit: 1000000 }))
  // } else {
  //   console.log('Acct 2 already has an active trove')
  // }

  // const acct2Trove = await beraborrowCore.troveManager.Troves(account2Wallet.address)
  // th.logBN('acct2 debt', acct2Trove[0])
  // th.logBN('acct2 coll', acct2Trove[1])
  // th.logBN('acct2 stake', acct2Trove[2])
  // console.log(`acct2 trove status: ${acct2Trove[3]}`)

  // // Log deployer's pending NECT gain - check fees went to staker (deloyer)
  // deployerNECTRevShare = await POLLENContracts.pollenStaking.getPendingNECTGain(deployerWallet.address)
  // th.logBN("deployer pending NECT revenue share from staking, after acct 2 opened trove", deployerNECTRevShare)

  // //  --- deployer withdraws staking gains ---
  // console.log("CHECK DEPLOYER WITHDRAWING STAKING GAINS")

  // // check deployer's NECT balance before withdrawing staking gains
  // deployerNECTBal = await beraborrowCore.nectToken.balanceOf(deployerWallet.address)
  // th.logBN('deployer NECT bal before withdrawing staking gains', deployerNECTBal)

  // // Deployer withdraws staking gains
  // await mdh.sendAndWaitForTransaction(POLLENContracts.pollenStaking.unstake(0, { gasPrice, gasLimit: 1000000 }))

  // // check deployer's NECT balance after withdrawing staking gains
  // deployerNECTBal = await beraborrowCore.nectToken.balanceOf(deployerWallet.address)
  // th.logBN('deployer NECT bal after withdrawing staking gains', deployerNECTBal)


  // // --- System stats  ---

  // Uniswap NECT-iBGT pool size
  reserves = await NECTiBGTPair.getReserves()
  th.logBN("NECT-iBGT Pair's current NECT reserves", reserves[0])
  th.logBN("NECT-iBGT Pair's current iBGT reserves", reserves[1])

  // Number of troves
  const numTroves = await beraborrowCore.troveManager.getTroveOwnersCount()
  console.log(`number of troves: ${numTroves} `)

  // Sorted list size
  const listSize = await beraborrowCore.sortedTroves.getSize()
  console.log(`Trove list size: ${listSize} `)

  // Total system debt and coll
  const entireSystemDebt = await beraborrowCore.troveManager.getEntireSystemDebt()
  const entireSystemColl = await beraborrowCore.troveManager.getEntireSystemColl()
  th.logBN("Entire system debt", entireSystemDebt)
  th.logBN("Entire system coll", entireSystemColl)
  
  // TCR
  const TCR = await beraborrowCore.troveManager.getTCR(chainlinkPrice)
  console.log(`TCR: ${TCR}`)

  // current borrowing rate
  const baseRate = await beraborrowCore.troveManager.baseRate()
  const currentBorrowingRate = await beraborrowCore.troveManager.getBorrowingRateWithDecay()
  th.logBN("Base rate", baseRate)
  th.logBN("Current borrowing rate", currentBorrowingRate)

  // total SP deposits
  const totalSPDeposits = await beraborrowCore.stabilityPool.getTotalNECTDeposits()
  th.logBN("Total NECT SP deposits", totalSPDeposits)

  // total POLLEN Staked in POLLENStaking
  const totalPOLLENStaked = await POLLENContracts.pollenStaking.totalPOLLENStaked()
  th.logBN("Total POLLEN staked", totalPOLLENStaked)

  // total LP tokens staked in Unipool
  const totalLPTokensStaked = await unipool.totalSupply()
  th.logBN("Total LP (NECT-iBGT) tokens staked in unipool", totalLPTokensStaked)

  // --- State variables ---

  // TroveManager 
  console.log("TroveManager state variables:")
  const totalStakes = await beraborrowCore.troveManager.totalStakes()
  const totalStakesSnapshot = await beraborrowCore.troveManager.totalStakesSnapshot()
  const totalCollateralSnapshot = await beraborrowCore.troveManager.totalCollateralSnapshot()
  th.logBN("Total trove stakes", totalStakes)
  th.logBN("Snapshot of total trove stakes before last liq. ", totalStakesSnapshot)
  th.logBN("Snapshot of total trove collateral before last liq. ", totalCollateralSnapshot)

  const L_iBGT = await beraborrowCore.troveManager.L_iBGT()
  const L_NECTDebt = await beraborrowCore.troveManager.L_NECTDebt()
  th.logBN("L_iBGT", L_iBGT)
  th.logBN("L_NECTDebt", L_NECTDebt)

  // StabilityPool
  console.log("StabilityPool state variables:")
  const P = await beraborrowCore.stabilityPool.P()
  const currentScale = await beraborrowCore.stabilityPool.currentScale()
  const currentEpoch = await beraborrowCore.stabilityPool.currentEpoch()
  const S = await beraborrowCore.stabilityPool.epochToScaleToSum(currentEpoch, currentScale)
  const G = await beraborrowCore.stabilityPool.epochToScaleToG(currentEpoch, currentScale)
  th.logBN("Product P", P)
  th.logBN("Current epoch", currentEpoch)
  th.logBN("Current scale", currentScale)
  th.logBN("Sum S, at current epoch and scale", S)
  th.logBN("Sum G, at current epoch and scale", G)

  // POLLENStaking
  console.log("POLLENStaking state variables:")
  const F_NECT = await POLLENContracts.pollenStaking.F_NECT()
  const F_iBGT = await POLLENContracts.pollenStaking.F_iBGT()
  th.logBN("F_NECT", F_NECT)
  th.logBN("F_iBGT", F_iBGT)


  // CommunityIssuance
  console.log("CommunityIssuance state variables:")
  const totalPOLLENIssued = await POLLENContracts.communityIssuance.totalPOLLENIssued()
  th.logBN("Total POLLEN issued to depositors / front ends", totalPOLLENIssued)


  // TODO: Uniswap *POLLEN-iBGT* pool size (check it's deployed?)















  // ************************
  // --- NOT FOR APRIL 5: Deploy a POLLENToken2 with General Safe as beneficiary to test minting POLLEN showing up in Gnosis App  ---

  // // General Safe POLLEN bal before:
  // const realGeneralSafeAddr = "0xF06016D822943C42e3Cb7FC3a6A3B1889C1045f8"

  //   const POLLENToken2EthersFactory = await ethers.getContractFactory("POLLENToken2", deployerWallet)
  //   const pollenToken2 = await POLLENToken2EthersFactory.deploy( 
  //     "0xF41E0DD45d411102ed74c047BdA544396cB71E27",  // CI param: LC1 
  //     "0x9694a04263593AC6b895Fc01Df5929E1FC7495fA", // POLLEN Staking param: LC2
  //     "0x98f95E112da23c7b753D8AE39515A585be6Fb5Ef", // LCF param: LC3
  //     realGeneralSafeAddr,  // bounty/hackathon param: REAL general safe addr
  //     "0x98f95E112da23c7b753D8AE39515A585be6Fb5Ef", // LP rewards param: LC3
  //     deployerWallet.address, // multisig param: deployer wallet
  //     {gasPrice, gasLimit: 10000000}
  //   )

  //   console.log(`pollen2 address: ${pollenToken2.address}`)

  //   let generalSafePOLLENBal = await pollenToken2.balanceOf(realGeneralSafeAddr)
  //   console.log(`generalSafePOLLENBal: ${generalSafePOLLENBal}`)



  // ************************
  // --- NOT FOR APRIL 5: Test short-term lockup contract POLLEN withdrawal on mainnet ---

  // now = (await ethers.provider.getBlock(latestBlock)).timestamp

  // const LCShortTermEthersFactory = await ethers.getContractFactory("LockupContractShortTerm", deployerWallet)

  // new deployment
  // const LCshortTerm = await LCShortTermEthersFactory.deploy(
  //   POLLENContracts.pollenToken.address,
  //   deployerWallet.address,
  //   now, 
  //   {gasPrice, gasLimit: 1000000}
  // )

  // LCshortTerm.deployTransaction.wait()

  // existing deployment
  // const deployedShortTermLC = await new ethers.Contract(
  //   "0xbA8c3C09e9f55dA98c5cF0C28d15Acb927792dC7", 
  //   LCShortTermEthersFactory.interface,
  //   deployerWallet
  // )

  // new deployment
  // console.log(`Short term LC Address:  ${LCshortTerm.address}`)
  // console.log(`recorded beneficiary in short term LC:  ${await LCshortTerm.beneficiary()}`)
  // console.log(`recorded short term LC name:  ${await LCshortTerm.NAME()}`)

  // existing deployment
  //   console.log(`Short term LC Address:  ${deployedShortTermLC.address}`)
  //   console.log(`recorded beneficiary in short term LC:  ${await deployedShortTermLC.beneficiary()}`)
  //   console.log(`recorded short term LC name:  ${await deployedShortTermLC.NAME()}`)
  //   console.log(`recorded short term LC name:  ${await deployedShortTermLC.unlockTime()}`)
  //   now = (await ethers.provider.getBlock(latestBlock)).timestamp
  //   console.log(`time now: ${now}`)

  //   // check deployer POLLEN bal
  //   let deployerPOLLENBal = await POLLENContracts.pollenToken.balanceOf(deployerWallet.address)
  //   console.log(`deployerPOLLENBal before he withdraws: ${deployerPOLLENBal}`)

  //   // check LC POLLEN bal
  //   let LC_POLLENBal = await POLLENContracts.pollenToken.balanceOf(deployedShortTermLC.address)
  //   console.log(`LC POLLEN bal before withdrawal: ${LC_POLLENBal}`)

  // // withdraw from LC
  // const withdrawFromShortTermTx = await deployedShortTermLC.withdrawPOLLEN( {gasPrice, gasLimit: 1000000})
  // withdrawFromShortTermTx.wait()

  // // check deployer bal after LC withdrawal
  // deployerPOLLENBal = await POLLENContracts.pollenToken.balanceOf(deployerWallet.address)
  // console.log(`deployerPOLLENBal after he withdraws: ${deployerPOLLENBal}`)

  //   // check LC POLLEN bal
  //   LC_POLLENBal = await POLLENContracts.pollenToken.balanceOf(deployedShortTermLC.address)
  //   console.log(`LC POLLEN bal after withdrawal: ${LC_POLLENBal}`)
}

module.exports = {
  mainnetDeploy
}
