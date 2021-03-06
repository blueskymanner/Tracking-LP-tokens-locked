const getETHWeb3 = require('../utils/getETHweb3.js');
const multicallETHabi = require("../abi/multicallETH_abi.json");
const { Interface } = require("@ethersproject/abi");

let multiETHAddr = "0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441";

module.exports = multicallETH = async (abi, calls) => {

  // let provider = new ethers.providers.Web3Provider(window.ethereum);
  // let signer = provider.getSigner();
  // const multiETHPortal = new ethers.Contract(multiETHAddr, multicallETHabi, signer);

  // let currentProvider = new Web3.providers.HttpProvider("https://mainnet-nethermind.blockscout.com");
  // let provider = new ethers.providers.Web3Provider(currentProvider);
  // const multiETHPortal = new ethers.Contract(multiETHAddr, multicallETHabi, provider);

  const web3 = getETHWeb3();
  const multiETHPortal = new web3.eth.Contract(multicallETHabi, multiETHAddr);
  const itf = new Interface(abi);

  const calldata = calls.map((call) => [call.address.toLowerCase(), itf.encodeFunctionData(call.name, call.params)]);
  const { returnData } = await multiETHPortal.methods.aggregate(calldata).call();
  const res = returnData.map((call, i) => itf.decodeFunctionResult(calls[i].name, call));

  return res;
}
