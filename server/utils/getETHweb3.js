const Web3 = require('web3');

const httpProvider = new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");

module.exports = getETHWeb3 = () => {
    const web3 = new Web3(httpProvider);
    return web3;
}
