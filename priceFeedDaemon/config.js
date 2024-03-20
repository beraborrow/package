const chainConfig = {
    berachain: {
        label: "SEI",
        decimals: 18,
        chainId: 80085,
        rpcUrls: ["https://artio.rpc.berachain.com/"],
        blockExplorer: "https://artio.beratrail.io/",
        NECT_ORACLE_ADDRESS: "0x17e4D35BDC735A1e1C9fC274F6aC892ed1c416D5",
        iBGT_ORACLE_ADDRESS: "0x8b327b4B93B7aAA184aA2F90Fba34185F80C3429"
    }
}

module.exports = chainConfig