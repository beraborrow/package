# @beraborrow/lib-ethers

[Ethers](https://www.npmjs.com/package/ethers)-based library for reading BeraBorrow protocol state and sending transactions.

## Quickstart

Install in your project:

```
npm install --save @beraborrow/lib-base @beraborrow/lib-ethers ethers@^5.0.0
```

Connecting to an Ethereum node and sending a transaction:

```javascript
const { Wallet, providers } = require("ethers");
const { EthersBeraBorrow } = require("@beraborrow/lib-ethers");

async function example() {
  const provider = new providers.JsonRpcProvider("http://localhost:8545");
  const wallet = new Wallet(process.env.PRIVATE_KEY).connect(provider);
  const beraborrow = await EthersBeraBorrow.connect(wallet);

  const { newTrove } = await beraborrow.openTrove({
    depositCollateral: 5, // iBGT
    borrowNECT: 2000
  });

  console.log(`Successfully opened a BeraBorrow Trove (${newTrove})!`);
}
```

## More examples

See [packages/examples](https://github.com/BeraBorrowOfficial/beraborrow-frontend/tree/master/packages/examples) in the repo.

BeraBorrow's [Dev UI](https://github.com/BeraBorrowOfficial/beraborrow-frontend/tree/master/packages/dev-frontend) itself contains many examples of `@beraborrow/lib-ethers` use.

## API Reference

For now, it can be found in the public BeraBorrow [repo](https://github.com/BeraBorrowOfficial/beraborrow-frontend/blob/master/docs/sdk/lib-ethers.md).

