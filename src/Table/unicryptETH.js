// import React, {useEffect, useState} from "react";
import { ethers } from "ethers";
import unicryptETHabi from "../abi/unicryptETH_abi.json";
import uniswapETHabi from "../abi/uniswapETH_abi.json";
import BigNumber from "bignumber.js";
import { createClient } from 'urql'
// import Axios from "axios";

const unicryptAddressETH = "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214";

async function UnicryptETH() {
  
    let provider = ethers.getDefaultProvider();
    const unicryptETHPortal = new ethers.Contract(unicryptAddressETH, unicryptETHabi, provider);
    let total_tokenNums = await unicryptETHPortal.getNumLockedTokens();

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
  
    let tokenAddr = [];
    const uniswapETHPortal = [];
    let token0Addr = [];
    let token1Addr = [];
    let LPdecimals = [];
    const tokensQuery0 = [];
    const tokensQuery1 = [];
    const tokenData0 = [];
    let decimals0 = [];
    let token0Symbol = [];
    let token0DerivedETH = [];
    const tokenData1 = [];
    let decimals1 = [];
    let token1Symbol = [];
    let token1DerivedETH = [];
    let tokenReserves = [];
    let tokenLockdata = [];
    let total_supply = [];
    let percentage = [];
    let token0Price = [];
    let token1Price = [];
    let period = [];
  
    let tokensinfo = [];
  
    for (let i = 0; i < 10; i++) {
      tokenAddr[i] = await unicryptETHPortal.getLockedTokenAtIndex(total_tokenNums - i - 1);
  
      uniswapETHPortal[i] = new ethers.Contract(tokenAddr[i], uniswapETHabi, provider);
      token0Addr[i] = await uniswapETHPortal[i].token0();
      token1Addr[i] = await uniswapETHPortal[i].token1();
      LPdecimals[i] = await uniswapETHPortal[i].decimals();
  
      // let apiurl = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${token1Addr}`;
      // const { data: datainfo } = await Axios.get(apiurl);
      // console.log(datainfo.market_data.current_price.usd);
  
      tokensQuery0[i] = `
        query {
          token(id: "${token0Addr[i].toLowerCase()}"){
            symbol
            decimals
            derivedETH
          }
        }
      `;
      tokensQuery1[i] = `
        query {
          token(id: "${token1Addr[i].toLowerCase()}"){
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
      
      tokenReserves[i] = await uniswapETHPortal[i].getReserves();
      tokenLockdata[i] = await unicryptETHPortal.tokenLocks(tokenAddr[i], 0);
      total_supply[i] = await uniswapETHPortal[i].totalSupply();

      percentage[i] = new BigNumber(tokenLockdata[i][1]._hex).dividedBy(10**LPdecimals[i]).dividedBy(new BigNumber(total_supply[i]._hex).dividedBy(10**LPdecimals[i]));
      token0Price[i] = new BigNumber(tokenReserves[i][0]._hex).dividedBy(10**decimals0[i]).multipliedBy(new BigNumber(token0DerivedETH[i])).multipliedBy(ethPrice);
      token1Price[i] = new BigNumber(tokenReserves[i][1]._hex).dividedBy(10**decimals1[i]).multipliedBy(new BigNumber(token1DerivedETH[i])).multipliedBy(ethPrice);
      period[i] = new BigNumber(tokenLockdata[i][3]._hex).minus(new BigNumber(tokenLockdata[i][0]._hex)).dividedBy(86400);

      tokensinfo.push({ tokenName: token0Symbol[i] + " / " + token1Symbol[i], 
                        blockchain: "Ethereum",
                        lockedPrice: "$" + token0Price[i].plus(token1Price[i]).multipliedBy(percentage[i]).toFormat(0), 
                        lockedAmount: new BigNumber(tokenLockdata[i][1]._hex).dividedBy(10**LPdecimals[i]).toFormat(2) + " (" + percentage[i].multipliedBy(100).toFormat(1) + "%)", 
                        unlockPeriod: period[i].toFormat(0) + "days", 
                        locker: "Unicrypt", 
                        marketCap: "$" + token0Price[i].plus(token1Price[i]).toFormat(0), 
                        rank: " ", 
                        score: token0Price[i].plus(token1Price[i]).multipliedBy(percentage[i]).multipliedBy(period[i]).multipliedBy(percentage[i]).toFormat(0) });
    }

    return tokensinfo;
  }

export default UnicryptETH;
