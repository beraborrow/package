const deploymentHelper = require("../utils/deploymentHelpers.js")
const testHelpers = require("../utils/testHelpers.js")
const DefaultPool = artifacts.require("./DefaultPool.sol")
const NonPayable = artifacts.require('NonPayable.sol')

const th = testHelpers.TestHelper
const dec = th.dec

contract('DefaultPool', async accounts => {
  let defaultPool
  let nonPayable
  let mockActivePool
  let mockTroveManager
  let iBGTToken
  let contracts

  let [owner] = accounts

  beforeEach('Deploy contracts', async () => {
    contracts = await deploymentHelper.deployBeraBorrowCore()
    defaultPool = await DefaultPool.new()
    nonPayable = await NonPayable.new()
    mockTroveManager = await NonPayable.new()
    mockActivePool = await NonPayable.new()
    iBGTToken = contracts.iBGTToken
    await defaultPool.setAddresses(mockTroveManager.address, mockActivePool.address)
  })

  it('sendiBGTToActivePool(): fails if receiver cannot receive iBGT', async () => {
    const amount = dec(1, 'ether')

    // start pool with `amount`
    try {
      await iBGTToken.increaseAllowance(mockActivePool.address, defaultPool.address, amount.toString())
      await iBGTToken.mint(mockActivePool.address, amount.toString())
    }catch (e) {
      console.log ("Approve failed.", e)
    }
    //await web3.eth.sendTransaction({ to: defaultPool.address, from: owner, value: amount })
    const tx = await mockActivePool.forward(defaultPool.address, '0x', { from: owner })
    assert.isTrue(tx.receipt.status)

    // try to send ibgt from pool to non-payable
    //await th.assertRevert(defaultPool.sendiBGTToActivePool(amount, { from: owner }), 'DefaultPool: sending iBGT failed')
    const sendiBGTData = th.getTransactionData('sendiBGTToActivePool(uint256)', [web3.utils.toHex(amount)])
    await th.assertRevert(mockTroveManager.forward(defaultPool.address, sendiBGTData, { from: owner }), 'DefaultPool: sending iBGT failed')
  })
})

contract('Reset chain state', async accounts => { })
