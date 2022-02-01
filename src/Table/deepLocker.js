// import React, {useEffect, useState} from "react";
import getBSCWeb3 from '../utils/getBSCweb3.js';
import deepLockerabi from "../abi/deepLocker_abi.json";
import pancakeswapBSCabi from "../abi/pancakeswapBSC_abi.json";
import BigNumber from "bignumber.js";
import multicallBSC from "./multicallBSC.js";
import { createClient } from 'urql'
import Axios from "axios";

const deepLockerAddr = "0x3f4D6bf08CB7A003488Ef082102C2e6418a4551e";

async function DeepLocker() {

    const web3 = getBSCWeb3();
    const deepLockerPortal = new web3.eth.Contract(deepLockerabi, deepLockerAddr);
    let total_tokenNums = await deepLockerPortal.methods.depositId().call();

    const APIURL = 'https://api.thegraph.com/subgraphs/name/pancakeswap/pairs';

    const client = createClient({
        url: APIURL,
    });

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

    for (let i = 0; i < 2; i++) {
        tokenLocks.push({address: deepLockerAddr, name: "lockedToken", params: [total_tokenNums-i]});
    }
    const tokenLocksArr = await multicallBSC(deepLockerabi, tokenLocks);

    for (let i = 0; i < tokenLocksArr.length; i++) {
        LPtokens.push({address: tokenLocksArr[i][0], name: "token0"});
        LPtokens.push({address: tokenLocksArr[i][0], name: "token1"});
        LPtokens.push({address: tokenLocksArr[i][0], name: "decimals"});
        LPtokens.push({address: tokenLocksArr[i][0], name: "getReserves"});
        LPtokens.push({address: tokenLocksArr[i][0], name: "totalSupply"});
    }
    const LPtokensArr = await multicallBSC(pancakeswapBSCabi, LPtokens);

    for (let i = 0; i < tokenLocksArr.length; i++) {
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

        percentage[i] = new BigNumber(tokenLocksArr[i][2]._hex).dividedBy(10**LPtokensArr[i*5+2][0]).dividedBy(new BigNumber(LPtokensArr[i*5+4][0]._hex).dividedBy(10**LPtokensArr[i*5+2][0]));
        token0Price[i] = new BigNumber(LPtokensArr[i*5+3][0]._hex).dividedBy(10**decimals0[i]).multipliedBy(new BigNumber(datainfo0[i].data.data.price));
        token1Price[i] = new BigNumber(LPtokensArr[i*5+3][1]._hex).dividedBy(10**decimals1[i]).multipliedBy(new BigNumber(datainfo1[i].data.data.price));
        period[i] = new BigNumber(tokenLocksArr[i][3]._hex).minus(LPtokensArr[i*5+3][2]).dividedBy(86400);

        tokensinfo.push({ tokenName : datainfo0[i].data.data.symbol + " / " + datainfo1[i].data.data.symbol, 
                        blockchain: "BSC",
                        lockedPrice: "$" + token0Price[i].plus(token1Price[i]).multipliedBy(percentage[i]).toFormat(0), 
                        lockedAmount: new BigNumber(tokenLocksArr[i][2]._hex).dividedBy(10**LPtokensArr[i*5+2][0]).toFormat(2) + " (" + percentage[i].multipliedBy(100).toFormat(1) + "%)", 
                        unlockPeriod: period[i].toFormat(0) + " days left", 
                        locker: "DeepLocker", 
                        marketCap: "$" + token0Price[i].plus(token1Price[i]).toFormat(0), 
                        rank: "—", 
                        score: token0Price[i].plus(token1Price[i]).multipliedBy(percentage[i]).multipliedBy(period[i]).multipliedBy(percentage[i]).toFormat(0) });
    }

    return tokensinfo;
}

export default DeepLocker;
