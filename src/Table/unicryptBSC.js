// import React, {useEffect, useState} from "react";
import { ethers } from "ethers";
import unicryptBSCabi from "../abi/unicryptBSC_abi.json";
import pancakeswapBSCabi from "../abi/pancakeswapBSC_abi.json";
import BigNumber from "bignumber.js";
import { createClient } from 'urql'
import Axios from "axios";

const unicryptAddressBSC = "0xC765bddB93b0D1c1A88282BA0fa6B2d00E3e0c83";

async function UnicryptBSC() {
    let provider, signer, unicryptBSCPortal, total_tokenNums;
    if (typeof window.ethereum !== 'undefined') {
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner(); // remove this
        unicryptBSCPortal = new ethers.Contract(unicryptAddressBSC, unicryptBSCabi, signer); // replace signer with provider
        total_tokenNums = await unicryptBSCPortal.getNumLockedTokens();
    }

    const APIURL = 'https://api.thegraph.com/subgraphs/name/pancakeswap/pairs';

    const client = createClient({
        url: APIURL,
    });

    let tokenAddr = [];
    const pancakeswapBSCPortal = [];
    let token0Addr = [];
    let token1Addr = [];
    let LPdecimals = [];
    let apiurl0 = [];
    let apiurl1 = [];
    let datainfo0 = [];
    let datainfo1 = [];
    const tokensQuery0 = [];
    const tokensQuery1 = [];
    const tokenData0 = [];
    let decimals0 = [];
    const tokenData1 = [];
    let decimals1 = [];
    let tokenReserves = [];
    let tokenLockdata = [];
    let total_supply = [];
    let percentage = [];
    let token0Price = [];
    let token1Price = [];
    let period = [];

    let tokensinfo = [];

    for (let i = 0; i < 10; i++) {
        tokenAddr[i] = await unicryptBSCPortal.getLockedTokenAtIndex(total_tokenNums - i - 1);

        pancakeswapBSCPortal[i] = new ethers.Contract(tokenAddr[i], pancakeswapBSCabi, provider);
        token0Addr[i] = await pancakeswapBSCPortal[i].token0();
        token1Addr[i] = await pancakeswapBSCPortal[i].token1();
        LPdecimals[i] = await pancakeswapBSCPortal[i].decimals();

        apiurl0[i] = `https://api.pancakeswap.info/api/v2/tokens/${token0Addr[i]}`;
        await Axios.get(apiurl0[i]).then(entry => 
            datainfo0.push(entry));

        apiurl1[i] = `https://api.pancakeswap.info/api/v2/tokens/${token1Addr[i]}`;
        await Axios.get(apiurl1[i]).then(entry => 
            datainfo1.push(entry));
            
        tokensQuery0[i] = `
        query {
          token(id: "${token0Addr[i].toLowerCase()}"){
            decimals
          }
        }
      `;
        tokensQuery1[i] = `
        query {
          token(id: "${token1Addr[i].toLowerCase()}"){
            decimals
          }
        }
      `;

        tokenData0[i] = await client.query(tokensQuery0[i]).toPromise();
        decimals0[i] = tokenData0[i].data.token.decimals;

        tokenData1[i] = await client.query(tokensQuery1[i]).toPromise();
        decimals1[i] = tokenData1[i].data.token.decimals;

        tokenReserves[i] = await pancakeswapBSCPortal[i].getReserves();
        tokenLockdata[i] = await unicryptBSCPortal.tokenLocks(tokenAddr[i], 0);
        total_supply[i] = await pancakeswapBSCPortal[i].totalSupply();
        
        percentage[i] = new BigNumber(tokenLockdata[i][1]._hex).dividedBy(10 ** LPdecimals[i]).dividedBy(new BigNumber(total_supply[i]._hex).dividedBy(10 ** LPdecimals[i]));
        token0Price[i] = new BigNumber(tokenReserves[i][0]._hex).dividedBy(10 ** decimals0[i]).multipliedBy(new BigNumber(datainfo0[i].data.data.price));
        token1Price[i] = new BigNumber(tokenReserves[i][1]._hex).dividedBy(10 ** decimals1[i]).multipliedBy(new BigNumber(datainfo1[i].data.data.price));
        period[i] = new BigNumber(tokenLockdata[i][3]._hex).minus(new BigNumber(tokenLockdata[i][0]._hex)).dividedBy(86400);

        tokensinfo.push({
            tokenName: datainfo0[i].data.data.symbol + " / " + datainfo1[i].data.data.symbol,
            blockchain: "BSC",
            lockedPrice: "$" + token0Price[i].plus(token1Price[i]).multipliedBy(percentage[i]).toFormat(0),
            lockedAmount: new BigNumber(tokenLockdata[i][1]._hex).dividedBy(10 ** LPdecimals[i]).toFormat(2) + " (" + percentage[i].multipliedBy(100).toFormat(1) + "%)",
            unlockPeriod: period[i].toFormat(0) + "days",
            locker: "Unicrypt",
            marketCap: "$" + token0Price[i].plus(token1Price[i]).toFormat(0),
            rank: " ",
            score: token0Price[i].plus(token1Price[i]).multipliedBy(percentage[i]).multipliedBy(period[i]).multipliedBy(percentage[i]).toFormat(0)
        });
    }

    return tokensinfo;
}

export default UnicryptBSC;
