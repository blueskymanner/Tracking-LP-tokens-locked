// import React, {useEffect, useState} from "react";
import getETHWeb3 from '../utils/getweb3.js';
import unicryptETHabi from "../abi/unicryptETH_abi.json";
import uniswapETHabi from "../abi/uniswapETH_abi.json";
import BigNumber from "bignumber.js";
import multicallETH from "./multicallETH.js";
import { createClient } from 'urql'
// import Axios from "axios";

const unicryptAddressETH = "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214";

async function UnicryptETH() {

  // let provider = ethers.getDefaultProvider();
  // const unicryptETHPortal = new ethers.Contract(unicryptAddressETH, unicryptETHabi, provider);
  // let total_tokenNums = await unicryptETHPortal.getNumLockedTokens();

  const web3 = getETHWeb3();
  const unicryptETHPortal = new web3.eth.Contract(unicryptETHabi, unicryptAddressETH);
  let total_tokenNums = await unicryptETHPortal.methods.getNumLockedTokens().call();

  //   // let apiurl = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${token1Addr}`;
  //   // const { data: datainfo } = await Axios.get(apiurl);
  //   // console.log(datainfo.market_data.current_price.usd);

  const APIURL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2';
  const ethpriceQuery = `
      query {
        bundle(id: "1" ) {
          ethPrice
        }
      }
    `;

  const client = createClient({
    url: APIURL,
  });
  const ethData = await client.query(ethpriceQuery).toPromise();
  let ethPrice = ethData.data.bundle.ethPrice;

  let tokenAddrs = [];
  let tokenLocks = [];
  let LPtokens = [];

  let tokensQuery0 = [];
  let tokenData0 = [];
  let decimals0 = [];
  let token0Symbol = [];
  let token0DerivedETH = [];
  
  let tokensQuery1 = [];
  let tokenData1 = [];
  let decimals1 = [];
  let token1Symbol = [];
  let token1DerivedETH = [];

  let percentage = [];
  let token0Price = [];
  let token1Price = [];
  let period = [];

  let tokensinfo = [];

  for (let i = 0; i < 2; i++) {
    tokenAddrs.push({address: unicryptAddressETH, name: "getLockedTokenAtIndex", params: [total_tokenNums-i-1]});
  }
  const tokenAddrsArr = await multicallETH(unicryptETHabi, tokenAddrs);

  for (let i = 0; i < tokenAddrsArr.length; i++) {
    tokenLocks.push({address: unicryptAddressETH, name: "tokenLocks", params: [tokenAddrsArr[i][0], 0]});
  }
  const tokenLocksArr = await multicallETH(unicryptETHabi, tokenLocks);

  for (let i = 0; i < tokenAddrsArr.length; i++) {
    LPtokens.push({address: tokenAddrsArr[i][0], name: "token0"});
    LPtokens.push({address: tokenAddrsArr[i][0], name: "token1"});
    LPtokens.push({address: tokenAddrsArr[i][0], name: "decimals"});
    LPtokens.push({address: tokenAddrsArr[i][0], name: "getReserves"});
    LPtokens.push({address: tokenAddrsArr[i][0], name: "totalSupply"});
  }
  const LPtokensArr = await multicallETH(uniswapETHabi, LPtokens);

  for (let i = 0; i < tokenAddrsArr.length; i++) {
    tokensQuery0[i] = `
      query {
        token(id: "${LPtokensArr[i*5][0].toLowerCase()}"){
          symbol
          decimals
          derivedETH
        }
      }
    `;

    tokensQuery1[i] = `
      query {
        token(id: "${LPtokensArr[i*5+1][0].toLowerCase()}"){
          symbol
          decimals
          derivedETH
        }
      }
    `;

    tokenData0[i] = await client.query(tokensQuery0[i]).toPromise();
    decimals0[i] = tokenData0[i].data.token.decimals;
    token0Symbol[i] = tokenData0[i].data.token.symbol;
    token0DerivedETH[i] = tokenData0[i].data.token.derivedETH;

    tokenData1[i] = await client.query(tokensQuery1[i]).toPromise();
    decimals1[i] = tokenData1[i].data.token.decimals;
    token1Symbol[i] = tokenData1[i].data.token.symbol;
    token1DerivedETH[i] = tokenData1[i].data.token.derivedETH;

    percentage[i] = new BigNumber(tokenLocksArr[i][1]._hex).dividedBy(10**LPtokensArr[i*5+2][0]).dividedBy(new BigNumber(LPtokensArr[i*5+4][0]._hex).dividedBy(10**LPtokensArr[i*5+2][0]));
    token0Price[i] = new BigNumber(LPtokensArr[i*5+3][0]._hex).dividedBy(10**decimals0[i]).multipliedBy(new BigNumber(token0DerivedETH[i])).multipliedBy(ethPrice);
    token1Price[i] = new BigNumber(LPtokensArr[i*5+3][1]._hex).dividedBy(10**decimals1[i]).multipliedBy(new BigNumber(token1DerivedETH[i])).multipliedBy(ethPrice);
    period[i] = new BigNumber(tokenLocksArr[i][3]._hex).minus(new BigNumber(tokenLocksArr[i][0]._hex)).dividedBy(86400);

    tokensinfo.push({ tokenName: token0Symbol[i] + " / " + token1Symbol[i], 
                      blockchain: "Ethereum",
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

export default UnicryptETH;
