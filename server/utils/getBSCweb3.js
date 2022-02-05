const Web3 = require('web3');

const currentProvider = new Web3.providers.HttpProvider("https://binance.nodereal.io");

module.exports = getBSCWeb3 = () => {
    const web3 = new Web3(currentProvider);
    return web3;
}
