import getBSCWeb3 from '../utils/getBSCweb3.js';
import { Interface } from '@ethersproject/abi';
import multicallBSCabi from "../abi/multicallBSC_abi.json";

let multiBSCAddr = "0x1ee38d535d541c55c9dae27b12edf090c608e6fb";

const multicallBSC = async (abi, calls) => {

  const web3 = getBSCWeb3();
  const multiETHPortal = new web3.eth.Contract(multicallBSCabi, multiBSCAddr);
  const itf = new Interface(abi);

  const calldata = calls.map((call) => [call.address.toLowerCase(), itf.encodeFunctionData(call.name, call.params)]);
  const { returnData } = await multiETHPortal.methods.aggregate(calldata).call();
  const res = returnData.map((call, i) => itf.decodeFunctionResult(calls[i].name, call));

  return res;
}

export default multicallBSC
