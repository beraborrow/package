const deploymentHelper = require("../utils/deploymentHelpers.js")

contract('Deployment script - Sets correct contract addresses dependencies after deployment', async accounts => {
  const [owner] = accounts;

  const [bountyAddress, lpRewardsAddress, multisig] = accounts.slice(997, 1000)
  
  let priceFeed
  let nectToken
  let sortedTroves
  let troveManager
  let activePool
  let stabilityPool
  let defaultPool
  let functionCaller
  let borrowerOperations
  let pollenStaking
  let pollenToken
  let communityIssuance
  let lockupContractFactory

  before(async () => {
    const coreContracts = await deploymentHelper.deployBeraBorrowCore()
    const POLLENContracts = await deploymentHelper.deployPOLLENContracts(bountyAddress, lpRewardsAddress, multisig)

    priceFeed = coreContracts.priceFeedTestnet
    nectToken = coreContracts.nectToken
    sortedTroves = coreContracts.sortedTroves
    troveManager = coreContracts.troveManager
    activePool = coreContracts.activePool
    stabilityPool = coreContracts.stabilityPool
    defaultPool = coreContracts.defaultPool
    functionCaller = coreContracts.functionCaller
    borrowerOperations = coreContracts.borrowerOperations

    pollenStaking = POLLENContracts.pollenStaking
    pollenToken = POLLENContracts.pollenToken
    communityIssuance = POLLENContracts.communityIssuance
    lockupContractFactory = POLLENContracts.lockupContractFactory

    await deploymentHelper.connectPOLLENContracts(POLLENContracts)
    await deploymentHelper.connectCoreContracts(coreContracts, POLLENContracts)
    await deploymentHelper.connectPOLLENContractsToCore(POLLENContracts, coreContracts)
  })

  it('Sets the correct PriceFeed address in TroveManager', async () => {
    const priceFeedAddress = priceFeed.address

    const recordedPriceFeedAddress = await troveManager.priceFeed()

    assert.equal(priceFeedAddress, recordedPriceFeedAddress)
  })

  it('Sets the correct NECTToken address in TroveManager', async () => {
    const nectTokenAddress = nectToken.address

    const recordedClvTokenAddress = await troveManager.nectToken()

    assert.equal(nectTokenAddress, recordedClvTokenAddress)
  })

  it('Sets the correct SortedTroves address in TroveManager', async () => {
    const sortedTrovesAddress = sortedTroves.address

    const recordedSortedTrovesAddress = await troveManager.sortedTroves()

    assert.equal(sortedTrovesAddress, recordedSortedTrovesAddress)
  })

  it('Sets the correct BorrowerOperations address in TroveManager', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await troveManager.borrowerOperationsAddress()

    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  // ActivePool in TroveM
  it('Sets the correct ActivePool address in TroveManager', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddresss = await troveManager.activePool()

    assert.equal(activePoolAddress, recordedActivePoolAddresss)
  })

  // DefaultPool in TroveM
  it('Sets the correct DefaultPool address in TroveManager', async () => {
    const defaultPoolAddress = defaultPool.address

    const recordedDefaultPoolAddresss = await troveManager.defaultPool()

    assert.equal(defaultPoolAddress, recordedDefaultPoolAddresss)
  })

  // StabilityPool in TroveM
  it('Sets the correct StabilityPool address in TroveManager', async () => {
    const stabilityPoolAddress = stabilityPool.address

    const recordedStabilityPoolAddresss = await troveManager.stabilityPool()

    assert.equal(stabilityPoolAddress, recordedStabilityPoolAddresss)
  })

  // POLLEN Staking in TroveM
  it('Sets the correct POLLENStaking address in TroveManager', async () => {
    const pollenStakingAddress = pollenStaking.address

    const recordedPOLLENStakingAddress = await troveManager.pollenStaking()
    assert.equal(pollenStakingAddress, recordedPOLLENStakingAddress)
  })

  // Active Pool

  it('Sets the correct StabilityPool address in ActivePool', async () => {
    const stabilityPoolAddress = stabilityPool.address

    const recordedStabilityPoolAddress = await activePool.stabilityPoolAddress()

    assert.equal(stabilityPoolAddress, recordedStabilityPoolAddress)
  })

  it('Sets the correct DefaultPool address in ActivePool', async () => {
    const defaultPoolAddress = defaultPool.address

    const recordedDefaultPoolAddress = await activePool.defaultPoolAddress()

    assert.equal(defaultPoolAddress, recordedDefaultPoolAddress)
  })

  it('Sets the correct BorrowerOperations address in ActivePool', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await activePool.borrowerOperationsAddress()

    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  it('Sets the correct TroveManager address in ActivePool', async () => {
    const troveManagerAddress = troveManager.address

    const recordedTroveManagerAddress = await activePool.troveManagerAddress()
    assert.equal(troveManagerAddress, recordedTroveManagerAddress)
  })

  // Stability Pool

  it('Sets the correct ActivePool address in StabilityPool', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await stabilityPool.activePool()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  it('Sets the correct BorrowerOperations address in StabilityPool', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await stabilityPool.borrowerOperations()

    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  it('Sets the correct NECTToken address in StabilityPool', async () => {
    const nectTokenAddress = nectToken.address

    const recordedClvTokenAddress = await stabilityPool.nectToken()

    assert.equal(nectTokenAddress, recordedClvTokenAddress)
  })

  it('Sets the correct TroveManager address in StabilityPool', async () => {
    const troveManagerAddress = troveManager.address

    const recordedTroveManagerAddress = await stabilityPool.troveManager()
    assert.equal(troveManagerAddress, recordedTroveManagerAddress)
  })

  // Default Pool

  it('Sets the correct TroveManager address in DefaultPool', async () => {
    const troveManagerAddress = troveManager.address

    const recordedTroveManagerAddress = await defaultPool.troveManagerAddress()
    assert.equal(troveManagerAddress, recordedTroveManagerAddress)
  })

  it('Sets the correct ActivePool address in DefaultPool', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await defaultPool.activePoolAddress()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  it('Sets the correct TroveManager address in SortedTroves', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await sortedTroves.borrowerOperationsAddress()
    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  it('Sets the correct BorrowerOperations address in SortedTroves', async () => {
    const troveManagerAddress = troveManager.address

    const recordedTroveManagerAddress = await sortedTroves.troveManager()
    assert.equal(troveManagerAddress, recordedTroveManagerAddress)
  })

  //--- BorrowerOperations ---

  // TroveManager in BO
  it('Sets the correct TroveManager address in BorrowerOperations', async () => {
    const troveManagerAddress = troveManager.address

    const recordedTroveManagerAddress = await borrowerOperations.troveManager()
    assert.equal(troveManagerAddress, recordedTroveManagerAddress)
  })

  // setPriceFeed in BO
  it('Sets the correct PriceFeed address in BorrowerOperations', async () => {
    const priceFeedAddress = priceFeed.address

    const recordedPriceFeedAddress = await borrowerOperations.priceFeed()
    assert.equal(priceFeedAddress, recordedPriceFeedAddress)
  })

  // setSortedTroves in BO
  it('Sets the correct SortedTroves address in BorrowerOperations', async () => {
    const sortedTrovesAddress = sortedTroves.address

    const recordedSortedTrovesAddress = await borrowerOperations.sortedTroves()
    assert.equal(sortedTrovesAddress, recordedSortedTrovesAddress)
  })

  // setActivePool in BO
  it('Sets the correct ActivePool address in BorrowerOperations', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await borrowerOperations.activePool()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  // setDefaultPool in BO
  it('Sets the correct DefaultPool address in BorrowerOperations', async () => {
    const defaultPoolAddress = defaultPool.address

    const recordedDefaultPoolAddress = await borrowerOperations.defaultPool()
    assert.equal(defaultPoolAddress, recordedDefaultPoolAddress)
  })

  // POLLEN Staking in BO
  it('Sets the correct POLLENStaking address in BorrowerOperations', async () => {
    const pollenStakingAddress = pollenStaking.address

    const recordedPOLLENStakingAddress = await borrowerOperations.pollenStakingAddress()
    assert.equal(pollenStakingAddress, recordedPOLLENStakingAddress)
  })


  // --- POLLEN Staking ---

  // Sets POLLENToken in POLLENStaking
  it('Sets the correct POLLENToken address in POLLENStaking', async () => {
    const pollenTokenAddress = pollenToken.address

    const recordedPOLLENTokenAddress = await pollenStaking.pollenToken()
    assert.equal(pollenTokenAddress, recordedPOLLENTokenAddress)
  })

  // Sets ActivePool in POLLENStaking
  it('Sets the correct ActivePool address in POLLENStaking', async () => {
    const activePoolAddress = activePool.address

    const recordedActivePoolAddress = await pollenStaking.activePoolAddress()
    assert.equal(activePoolAddress, recordedActivePoolAddress)
  })

  // Sets NECTToken in POLLENStaking
  it('Sets the correct ActivePool address in POLLENStaking', async () => {
    const nectTokenAddress = nectToken.address

    const recordedNECTTokenAddress = await pollenStaking.nectToken()
    assert.equal(nectTokenAddress, recordedNECTTokenAddress)
  })

  // Sets TroveManager in POLLENStaking
  it('Sets the correct ActivePool address in POLLENStaking', async () => {
    const troveManagerAddress = troveManager.address

    const recordedTroveManagerAddress = await pollenStaking.troveManagerAddress()
    assert.equal(troveManagerAddress, recordedTroveManagerAddress)
  })

  // Sets BorrowerOperations in POLLENStaking
  it('Sets the correct BorrowerOperations address in POLLENStaking', async () => {
    const borrowerOperationsAddress = borrowerOperations.address

    const recordedBorrowerOperationsAddress = await pollenStaking.borrowerOperationsAddress()
    assert.equal(borrowerOperationsAddress, recordedBorrowerOperationsAddress)
  })

  // ---  POLLENToken ---

  // Sets CI in POLLENToken
  it('Sets the correct CommunityIssuance address in POLLENToken', async () => {
    const communityIssuanceAddress = communityIssuance.address

    const recordedcommunityIssuanceAddress = await pollenToken.communityIssuanceAddress()
    assert.equal(communityIssuanceAddress, recordedcommunityIssuanceAddress)
  })

  // Sets POLLENStaking in POLLENToken
  it('Sets the correct POLLENStaking address in POLLENToken', async () => {
    const pollenStakingAddress = pollenStaking.address

    const recordedPOLLENStakingAddress =  await pollenToken.pollenStakingAddress()
    assert.equal(pollenStakingAddress, recordedPOLLENStakingAddress)
  })

  // Sets LCF in POLLENToken
  it('Sets the correct LockupContractFactory address in POLLENToken', async () => {
    const LCFAddress = lockupContractFactory.address

    const recordedLCFAddress =  await pollenToken.lockupContractFactory()
    assert.equal(LCFAddress, recordedLCFAddress)
  })

  // --- LCF  ---

  // Sets POLLENToken in LockupContractFactory
  it('Sets the correct POLLENToken address in LockupContractFactory', async () => {
    const pollenTokenAddress = pollenToken.address

    const recordedPOLLENTokenAddress = await lockupContractFactory.pollenTokenAddress()
    assert.equal(pollenTokenAddress, recordedPOLLENTokenAddress)
  })

  // --- CI ---

  // Sets POLLENToken in CommunityIssuance
  it('Sets the correct POLLENToken address in CommunityIssuance', async () => {
    const pollenTokenAddress = pollenToken.address

    const recordedPOLLENTokenAddress = await communityIssuance.pollenToken()
    assert.equal(pollenTokenAddress, recordedPOLLENTokenAddress)
  })

  it('Sets the correct StabilityPool address in CommunityIssuance', async () => {
    const stabilityPoolAddress = stabilityPool.address

    const recordedStabilityPoolAddress = await communityIssuance.stabilityPoolAddress()
    assert.equal(stabilityPoolAddress, recordedStabilityPoolAddress)
  })
})
