const getETHWeb3 = require('../utils/getETHweb3.js');
const unilockerETHabi = require('../abi/unicryptETH_abi.json');
const uniswapETHabi = require('../abi/uniswapETH_abi.json');
const multicallETH = require('./multicallETH.js');
const BigNumber = require("bignumber.js");
const fetch = require("node-fetch");
const cron = require("node-cron");
const dbo = require("../db/conn");


const unilockerAddressETH = "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214";

module.exports = async function UnilockerETH() {

    const web3 = getETHWeb3();
    const unilockerETHPortal = new web3.eth.Contract(unilockerETHabi, unilockerAddressETH);

    cron.schedule('* * * * *', async () => {
        let total_tokenNums = await unilockerETHPortal.methods.getNumLockedTokens().call();

        let ethPrice;
        try {
        await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              query {
                bundle(id: "1" ) {
                  ethPrice
                }
              }
            `
          }),
        })
          .then((res) => res.json())
          .then((result) => ethPrice = result.data.bundle.ethPrice);
        } catch(err) {
            console.log("Finding a ETH price on thegraph.");
            return;
        }

        let tokenData0;
        let tokenData1;
        let LPtokens = [];

        let lastIndex;
        let storingTokenName;
        let storingTokenAddr;

        const tokenAddrsArr = await unilockerETHPortal.methods.getLockedTokenAtIndex(total_tokenNums - 1).call();
        const tokenLocksArr = await unilockerETHPortal.methods.tokenLocks(tokenAddrsArr, 0).call();
        
        LPtokens.push({address: tokenAddrsArr, name: "token0"});
        LPtokens.push({address: tokenAddrsArr, name: "token1"});
        LPtokens.push({address: tokenAddrsArr, name: "decimals"});
        LPtokens.push({address: tokenAddrsArr, name: "getReserves"});
        LPtokens.push({address: tokenAddrsArr, name: "totalSupply"});

        const LPtokensArr = await multicallETH(uniswapETHabi, LPtokens);

        try {
        await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: `
            query {
                token(id: "${LPtokensArr[0][0].toLowerCase()}"){
                name
                symbol
                decimals
                derivedETH
                }
            }
            `
        }),
        })
        .then((res) => res.json())
        .then((result) => tokenData0 = result.data.token);
        } catch(err) {
            console.log("Finding a first token info on thegraph.");
            return;
        }

        try {
        await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: `
            query {
                token(id: "${LPtokensArr[1][0].toLowerCase()}"){
                name
                symbol
                decimals
                derivedETH
                }
            }
            `
        }),
        })
        .then((res) => res.json())
        .then((result) => tokenData1 = result.data.token);
        } catch(err) {
            console.log("Finding a second token info on thegraph.");
            return;
        }

        if (tokenData0.symbol == "WETH" || tokenData0.symbol == "WBNB" || tokenData0.symbol == "USDT" || tokenData0.symbol == "USDC" || tokenData0.symbol == "BUSD") {
            storingTokenName = tokenData1.name;
            storingTokenAddr = LPtokensArr[1][0];
        } else if (tokenData1.symbol == "WETH" || tokenData1.symbol == "WBNB" || tokenData1.symbol == "USDT" || tokenData1.symbol == "USDC" || tokenData1.symbol == "BUSD") {
            storingTokenName = tokenData0.name;
            storingTokenAddr = LPtokensArr[0][0];
        }

        let percentage = new BigNumber(tokenLocksArr[1]).dividedBy(10**LPtokensArr[2][0]).dividedBy(new BigNumber(LPtokensArr[4][0]._hex).dividedBy(10**LPtokensArr[2][0]));
        let token0Price = new BigNumber(LPtokensArr[3][0]._hex).dividedBy(10**tokenData0.decimals).multipliedBy(new BigNumber(tokenData0.derivedETH)).multipliedBy(ethPrice);
        let token1Price = new BigNumber(LPtokensArr[3][1]._hex).dividedBy(10**tokenData1.decimals).multipliedBy(new BigNumber(tokenData1.derivedETH)).multipliedBy(ethPrice);

        const epochNum1 = new Date(tokenLocksArr[3] * 1000);
        let unlockDate = epochNum1.toLocaleString();
    
        const epochNum2 = new Date(tokenLocksArr[0] * 1000);
        let lockDate = epochNum2.toLocaleString();

        let db_connect = dbo.getDb("myFirstDatabase");
        await db_connect.collection("lastIndexes").findOne({Locker: "Unilocker"}).then(function(result) {
            lastIndex = result;
        });
        console.log(lastIndex);

        if (lastIndex === null) {
            await db_connect.collection("lastIndexes").insertOne({Locker: "Unilocker", LastId: 3});
            let myobj = {
                PairToken: "FTF" + " / " + "WETH",
                Blockchain: "Ethereum",
                Liquidity_Percentage: 0.92,
                Tokens_Locked: 124.09,
                Locked_Date: new Date().toLocaleString(), 
                Time_to_unlock: "6/1/2022",
                Locker: "Unilocker",
                Marketcap: 2653.46,
                Coingecko_Rank: "???",
                Token_TotalAmount: 133.43,
                PairTokenAddress: "0xf19b55d677187423f8031a5bf0ac7b263b9ff76b",
                TokenName: "French Toast Friday",
                TokenAddress: "0x7DFFdEe13D9A5562d0fb9cF942bd4E7800800AdA",
                NativeSymbol: "WETH",
                NativeAmount: 1.00
            };
            await db_connect.collection("records").insertOne(myobj);
        } else {
            return;
        }
    });
}
