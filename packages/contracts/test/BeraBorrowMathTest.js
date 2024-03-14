const BeraBorrowMathTester = artifacts.require("./BeraBorrowMathTester.sol")

contract('BeraBorrowMath', async accounts => {
  let beraborrowMathTester
  beforeEach('deploy tester', async () => {
    beraborrowMathTester = await BeraBorrowMathTester.new()
  })

  const checkFunction = async (func, cond, params) => {
    assert.equal(await beraborrowMathTester[func](...params), cond(...params))
  }

  it('max works if a > b', async () => {
    await checkFunction('callMax', (a, b) => Math.max(a, b), [2, 1])
  })

  it('max works if a = b', async () => {
    await checkFunction('callMax', (a, b) => Math.max(a, b), [2, 2])
  })

  it('max works if a < b', async () => {
    await checkFunction('callMax', (a, b) => Math.max(a, b), [1, 2])
  })
})
