const { spawnSync } = require("child_process");

spawnSync("docker", [
  "run",
  "-d",
  "--rm",
  ...["--name", "openberachain"],
  ...["-p", "8545:8545/tcp"],
  ...["-p", "8546:8546/tcp"],
  ...["-v", `${__dirname}:/dev-chain`],

  "openberachain/openberachain",

  ...["--config", "/dev-chain/config.toml"]
]);
