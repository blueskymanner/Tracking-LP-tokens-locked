// import React, {useEffect, useState} from "react";
import getBSCWeb3 from '../utils/getweb3.js';
import unicryptBSCabi from "../abi/unicryptBSC_abi.json";
import pancakeswapBSCabi from "../abi/pancakeswapBSC_abi.json";
import BigNumber from "bignumber.js";
import multicallBSC from "./multicallBSC.js";
import { createClient } from 'urql'
import Axios from "axios";

const unicryptAddressBSC = "0xC765bddB93b0D1c1A88282BA0fa6B2d00E3e0c83";

async function UnicryptBSC() {

  const web3 = getBSCWeb3();
  const unicryptBSCPortal = new web3.eth.Contract(unicryptBSCabi, unicryptAddressBSC);
  let total_tokenNums = await unicryptBSCPortal.methods.getNumLockedTokens().call();

  const APIURL = 'https://api.thegraph.com/subgraphs/name/pancakeswap/pairs';

  const client = createClient({
        url: APIURL,
  });

  let tokenAddrs = [];
  let tokenLocks = [];
  let LPtokens = [];

  let tokensQuery0 = [];
  let tokenData0 = [];
  let decimals0 = [];
  
  let tokensQuery1 = [];
  let tokenData1 = [];
  let decimals1 = [];

  let apiurl0 = [];
  let apiurl1 = [];
  let datainfo0 = [];
  let datainfo1 = [];

  let percentage = [];
  let token0Price = [];
  let token1Price = [];
  let period = [];

  let tokensinfo = [];

  for (let i = 0; i < 10; i++) {
    tokenAddrs.push({address: unicryptAddressBSC, name: "getLockedTokenAtIndex", params: [total_tokenNums-i-1]});
  }
  const tokenAddrsArr = await multicallBSC(unicryptBSCabi, tokenAddrs);

  for (let i = 0; i < tokenAddrsArr.length; i++) {
    tokenLocks.push({address: unicryptAddressBSC, name: "tokenLocks", params: [tokenAddrsArr[i][0], 0]});
  }
  const tokenLocksArr = await multicallBSC(unicryptBSCabi, tokenLocks);

  for (let i = 0; i < tokenAddrsArr.length; i++) {
    LPtokens.push({address: tokenAddrsArr[i][0], name: "token0"});
    LPtokens.push({address: tokenAddrsArr[i][0], name: "token1"});
    LPtokens.push({address: tokenAddrsArr[i][0], name: "decimals"});
    LPtokens.push({address: tokenAddrsArr[i][0], name: "getReserves"});
    LPtokens.push({address: tokenAddrsArr[i][0], name: "totalSupply"});
  }
  const LPtokensArr = await multicallBSC(pancakeswapBSCabi, LPtokens);

  for (let i = 0; i < tokenAddrsArr.length; i++) {

    apiurl0[i] = `https://api.pancakeswap.info/api/v2/tokens/${LPtokensArr[i*5][0]}`;
    await Axios.get(apiurl0[i]).then(entry => 
      datainfo0.push(entry));
  
    apiurl1[i] = `https://api.pancakeswap.info/api/v2/tokens/${LPtokensArr[i*5+1][0]}`;
    await Axios.get(apiurl1[i]).then(entry => 
      datainfo1.push(entry));

    tokensQuery0[i] = `
    query {
      token(id: "${LPtokensArr[i*5][0].toLowerCase()}"){
        decimals
      }
    }
    `;
    tokensQuery1[i] = `
    query {
      token(id: "${LPtokensArr[i*5+1][0].toLowerCase()}"){
        decimals
      }
    }
    `;

    tokenData0[i] = await client.query(tokensQuery0[i]).toPromise();
    decimals0[i] = tokenData0[i].data.token.decimals;

    tokenData1[i] = await client.query(tokensQuery1[i]).toPromise();
    decimals1[i] = tokenData1[i].data.token.decimals;

    percentage[i] = new BigNumber(tokenLocksArr[i][1]._hex).dividedBy(10**LPtokensArr[i*5+2][0]).dividedBy(new BigNumber(LPtokensArr[i*5+4][0]._hex).dividedBy(10**LPtokensArr[i*5+2][0]));
    token0Price[i] = new BigNumber(LPtokensArr[i*5+3][0]._hex).dividedBy(10**decimals0[i]).multipliedBy(new BigNumber(datainfo0[i].data.data.price));
    token1Price[i] = new BigNumber(LPtokensArr[i*5+3][1]._hex).dividedBy(10**decimals1[i]).multipliedBy(new BigNumber(datainfo1[i].data.data.price));
    period[i] = new BigNumber(tokenLocksArr[i][3]._hex).minus(new BigNumber(tokenLocksArr[i][0]._hex)).dividedBy(86400);

    tokensinfo.push({ tokenName: datainfo0[i].data.data.symbol + " / " + datainfo1[i].data.data.symbol, 
                      blockchain: "BSC",
                      lockedPrice: "$" + token0Price[i].plus(token1Price[i]).multipliedBy(percentage[i]).toFormat(0), 
                      lockedAmount: new BigNumber(tokenLocksArr[i][1]._hex).dividedBy(10**LPtokensArr[i*5+2][0]).toFormat(2) + " (" + percentage[i].multipliedBy(100).toFormat(1) + "%)", 
                      unlockPeriod: period[i].toFormat(0) + "days", 
                      locker: "Unicrypt", 
                      marketCap: "$" + token0Price[i].plus(token1Price[i]).toFormat(0), 
                      rank: "—", 
                      score: token0Price[i].plus(token1Price[i]).multipliedBy(percentage[i]).multipliedBy(period[i]).multipliedBy(percentage[i]).toFormat(0) });
  }

  return tokensinfo;
}

export default UnicryptBSC;
