"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BNECTLPZap__factory = exports.ERC20Faucet__factory = exports.ChickenBondManager__factory = exports.BNECTToken__factory = exports.BondNFT__factory = exports.factories = void 0;
exports.factories = __importStar(require("./factories"));
var BondNFT__factory_1 = require("./factories/BondNFT__factory");
Object.defineProperty(exports, "BondNFT__factory", { enumerable: true, get: function () { return BondNFT__factory_1.BondNFT__factory; } });
var BNECTToken__factory_1 = require("./factories/BNECTToken__factory");
Object.defineProperty(exports, "BNECTToken__factory", { enumerable: true, get: function () { return BNECTToken__factory_1.BNECTToken__factory; } });
var ChickenBondManager__factory_1 = require("./factories/ChickenBondManager__factory");
Object.defineProperty(exports, "ChickenBondManager__factory", { enumerable: true, get: function () { return ChickenBondManager__factory_1.ChickenBondManager__factory; } });
var ERC20Faucet__factory_1 = require("./factories/ERC20Faucet__factory");
Object.defineProperty(exports, "ERC20Faucet__factory", { enumerable: true, get: function () { return ERC20Faucet__factory_1.ERC20Faucet__factory; } });
var BNECTLPZap__factory_1 = require("./factories/BNECTLPZap__factory");
Object.defineProperty(exports, "BNECTLPZap__factory", { enumerable: true, get: function () { return BNECTLPZap__factory_1.BNECTLPZap__factory; } });
