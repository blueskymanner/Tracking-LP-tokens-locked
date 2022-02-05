const getBSCWeb3 = require('../utils/getBSCweb3.js');
const multicallBSCabi = require("../abi/multicallBSC_abi.json");
const { Interface } = require("@ethersproject/abi");

let multiBSCAddr = "0x1ee38d535d541c55c9dae27b12edf090c608e6fb";

module.exports = multicallBSC = async (abi, calls) => {

  const web3 = getBSCWeb3();
  const multiETHPortal = new web3.eth.Contract(multicallBSCabi, multiBSCAddr);
  const itf = new Interface(abi);

  const calldata = calls.map((call) => [call.address.toLowerCase(), itf.encodeFunctionData(call.name, call.params)]);
  const { returnData } = await multiETHPortal.methods.aggregate(calldata).call();
  const res = returnData.map((call, i) => itf.decodeFunctionResult(calls[i].name, call));

  return res;
}
