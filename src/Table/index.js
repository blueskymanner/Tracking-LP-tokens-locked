import React, {useEffect, useState} from "react";
import { useTable, useGlobalFilter, useAsyncDebounce, useSortBy, usePagination } from "react-table";
// import get_gFees from './getdata.js';
import { ethers } from "ethers";
import unicryptETHabi from "../abi/unicryptETH_abi.json";
import uniswapETHabi from "../abi/uniswapETH_abi.json";
import BigNumber from "bignumber.js";
import { createClient } from 'urql'
import Axios from "axios";
import '../Style/style.css';

const unicryptAddressETH = "0x663A5C229c09b049E36dCc11a9B0d4a8Eb9db214";
// const unicryptAddressBSC = "0xC765bddB93b0D1c1A88282BA0fa6B2d00E3e0c83";

function GlobalFilter({
  preGlobalFilteredRows,
  globalFilter,
  setGlobalFilter
}) {
  const count = preGlobalFilteredRows.length;
  const [value, setValue] = React.useState(globalFilter);
  const onChange = useAsyncDebounce(async (value) => {
    setGlobalFilter(value || undefined);
    // let abc = await getAddress();
    // console.log(abc);
  }, 200);

  return (
    <span>
      Search: {" "}
      <input
        value={value || ""}
        onChange={(e) => {
          setValue(e.target.value);
          onChange(e.target.value);
        }}
        placeholder={`Enter Keyword`}
      />
    </span>
  );
}

function Actiontable({ columns, data }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    footerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
    state,
    preGlobalFilteredRows,
    setGlobalFilter
  } = useTable(
    {
      columns,
      data,
      initialState: { pageSize: 20 }
    },
    useGlobalFilter, useSortBy, usePagination
  );

  // console.log();

  // Render the UI for your table
  return (
    <>
      <div className="content">
        <div className="tablesection">
          <table
            {...getTableProps()}
          >
            <thead>
              <tr>
                <th
                  colSpan={100}
                  style={{
                    textAlign: "left",
                    padding: 10,
                    background: "yellow"
                  }}
                >
                  <GlobalFilter
                    preGlobalFilteredRows={preGlobalFilteredRows}
                    globalFilter={state.globalFilter}
                    setGlobalFilter={setGlobalFilter}
                  />
                </th>
              </tr>

              {headerGroups.map((group) => (
                <tr {...group.getHeaderGroupProps()}>
                  {group.headers.map((column) => (
                    <th {...column.getHeaderProps(column.getSortByToggleProps())}>{column.render("Header")}
                    {/* <span>{
                      column.isSorted
                          ? column.isSortedDesc
                                ? ' ?'
                                : ' ?'
                          : ''
                    }</span> */}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody {...getTableBodyProps()}>
              {page.map((row, i) => {
                prepareRow(row);
                return (
                  <tr {...row.getRowProps()}>
                    {row.cells.map((cell) => {
                      return <td {...cell.getCellProps()}>{cell.render("Cell")}</td>;
                    })}
                  </tr>
                );
              })}
            </tbody>
            {/* <tfoot>
              {footerGroups.map((group) => (
                <tr {...group.getFooterGroupProps()}>
                  {group.headers.map((column) => (
                    <td {...column.getFooterProps()}>{column.render("Footer")}</td>
                  ))}
                </tr>
              ))}
            </tfoot> */}
          </table>
        </div>

        <div className="pagination">
          <button onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
            {"<<"}
          </button>{" "}
          <button onClick={() => previousPage()} disabled={!canPreviousPage}>
            {"<"}
          </button>{" "}
          <button onClick={() => nextPage()} disabled={!canNextPage}>
            {">"}
          </button>{" "}
          <button onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
            {">>"}
          </button>{" "}
          <span>
            Page{" "}
            <strong>
              {pageIndex + 1} of {pageCount}
            </strong>{" "}
          </span>
          <span>
            | Go to page:{" "}
            <input
              type="number"
              defaultValue={pageIndex + 1}
              onChange={(e) => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                gotoPage(page);
              }}
              style={{ width: "100px" }}
            />
          </span>{" "}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
            }}
          >
            {[20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

async function GetAddress() {
  
  let provider = ethers.getDefaultProvider();
  const unicryptETHPortal = new ethers.Contract(unicryptAddressETH, unicryptETHabi, provider);
  let total_tokenNums = await unicryptETHPortal.getNumLockedTokens();
  let tokenAddr = await unicryptETHPortal.getLockedTokenAtIndex(total_tokenNums - 1);

  const uniswapETHPortal = new ethers.Contract(tokenAddr, uniswapETHabi, provider);
  let token0Addr = await uniswapETHPortal.token0();
  let token1Addr = await uniswapETHPortal.token1();
  let LPdecimals = await uniswapETHPortal.decimals();

  // let apiurl = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${token1Addr}`;
  // const { data: datainfo } = await Axios.get(apiurl);
  // console.log(datainfo.market_data.current_price.usd);

  const APIURL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2';
  const ethpriceQuery = `
    query {
      bundle(id: "1" ) {
        ethPrice
      }
    }
  `; 
  const tokensQuery0 = `
    query {
      token(id: "${token0Addr.toLowerCase()}"){
        name
        symbol
        decimals
        derivedETH
        tradeVolumeUSD
        totalLiquidity
      }
    }
  `;
  const tokensQuery1 = `
    query {
      token(id: "${token1Addr.toLowerCase()}"){
        name
        symbol
        decimals
        derivedETH
        tradeVolumeUSD
        totalLiquidity
      }
    }
  `;

  const client = createClient({
    url: APIURL,
  });
  const ethData = await client.query(ethpriceQuery).toPromise();
  let ethPrice = ethData.data.bundle.ethPrice;

  const tokenData0 = await client.query(tokensQuery0).toPromise();
  let decimals0 = tokenData0.data.token.decimals;
  let token0Symbol = tokenData0.data.token.symbol;
  let token0DerivedETH = tokenData0.data.token.derivedETH;

  const tokenData1 = await client.query(tokensQuery1).toPromise();
  let decimals1 = tokenData1.data.token.decimals;
  let token1Symbol = tokenData1.data.token.symbol;
  let token1DerivedETH = tokenData1.data.token.derivedETH;
  
  let tokenReserves = await uniswapETHPortal.getReserves();
  let token0Reserve = new BigNumber(tokenReserves[0]._hex).dividedBy(new BigNumber(10).pow(decimals0));
  let token1Reserve = new BigNumber(tokenReserves[1]._hex).dividedBy(new BigNumber(10).pow(decimals1));

  let tokenLockdata = await unicryptETHPortal.tokenLocks(tokenAddr, 0);
  let lockedAmount = new BigNumber(tokenLockdata[1]._hex).dividedBy(new BigNumber(10).pow(LPdecimals));
  let roundAmount = lockedAmount.toFormat(4);

  let total_supply = await uniswapETHPortal.totalSupply();
  let totalSupply = new BigNumber(total_supply._hex).dividedBy(new BigNumber(10).pow(LPdecimals));

  let percentage = lockedAmount.dividedBy(totalSupply);
  let percent = percentage.multipliedBy(new BigNumber(100)).toFormat(1);

  let token0Price = token0Reserve.multipliedBy(new BigNumber(token0DerivedETH)).multipliedBy(new BigNumber(ethPrice));
  let token1Price = token1Reserve.multipliedBy(new BigNumber(token1DerivedETH)).multipliedBy(new BigNumber(ethPrice));
  let LPmarketcap = token0Price.plus(token1Price);
  let lockedPrice = LPmarketcap.multipliedBy(percentage);
  let roundPrice = lockedPrice.toFormat(0);

  let lockDate = new BigNumber(tokenLockdata[0]._hex);
  let unlockDate = new BigNumber(tokenLockdata[3]._hex);
  let period = unlockDate.minus(lockDate).dividedBy(new BigNumber(86400));
  let roundPeriod = period.toFormat(0);

  let roundMarketCap = LPmarketcap.toFormat(0);
  let score = lockedPrice.multipliedBy(period).multipliedBy(percentage).toFormat(0);

  // token0Symbol + " / " + token1Symbol, Ethereum, "$" + roundPrice, roundAmount + " (" + percent + "%)", roundPeriod + "days", Unicrypt, "$" + roundMarketCap, " ", score
  // return roundAmount + " (" + percent + "%)";
  return { tokenName: token0Symbol + " / " + token1Symbol, 
            blockchain: "Ethereum", 
            lockedPrice: "$" + roundPrice, 
            lockedAmount: roundAmount + " (" + percent + "%)", 
            unlockPeriod: roundPeriod + "days", 
            locker: "Unicrypt", 
            marketCap: "$" + roundMarketCap, 
            rank: " ", 
            score: score };
}

function Table() {
  const [tokenInfo, setTokenInfo] = useState({});
    GetAddress().then(resp =>
    {
      setTokenInfo(resp);
    });

  const columns = React.useMemo(
    () => [
      {
        Header: "Token Name",
        accessor: "first"
      },
      {
        Header: "Blockchain",
        accessor: "second"
      },
      {
        Header: "Liquidity Locked $",
        accessor: "third"
      },
      {
        Header: "Tokens Locked %",
        accessor: "fourth"
      },
      {
        Header: "Time to unlock",
        accessor: "fifth"
      },
      {
        Header: "Locker",
        accessor: "sixth"
      },
      {
        Header: "Marketcap $",
        accessor: "seventh"
      },
      {
        Header: "Coingecko Rank #",
        accessor: "eighth"
      },
      {
        Header: "Score",
        accessor: "ninth"
      }
    ],
    []
  );

  const data = React.useMemo(
    () => [
      {
        first: tokenInfo.tokenName,
        second: tokenInfo.blockchain,
        third: tokenInfo.lockedPrice,
        fourth: tokenInfo.lockedAmount,
        fifth: tokenInfo.unlockPeriod,
        sixth: tokenInfo.locker,
        seventh: tokenInfo.marketCap,
        eighth: tokenInfo.rank,
        ninth: tokenInfo.score
      },
      {
        first: "Pinkcow",
        second: "Ethereum",
        third: 4578600,
        fourth: 122111,
        fifth: 20,
        sixth: "Deeplock",
        seventh: 2340000,
        eighth: 5455,
        ninth: 18890
      },
      {
        first: "Fake",
        second: "Ethereum",
        third: 457899,
        fourth: 400000,
        fifth: 15,
        sixth: "Unicrypt",
        seventh: 755555000,
        eighth: 23,
        ninth: 700
      },
      {
        first: "Fake",
        second: "Ethereum",
        third: 457899,
        fourth: 400000,
        fifth: 15,
        sixth: "Unicrypt",
        seventh: 755555000,
        eighth: 23,
        ninth: 700
      },
      {
        first: "safemoon",
        second: "BSC",
        third: 3200000,
        fourth: 100000000,
        fifth: 7,
        sixth: "Mudra",
        seventh: 23457777,
        eighth: 122,
        ninth: 13569000
      },
      {
        first: "Fake",
        second: "Ethereum",
        third: 457899,
        fourth: 400000,
        fifth: 15,
        sixth: "Unicrypt",
        seventh: 755555000,
        eighth: 23,
        ninth: 700
      },
      {
        first: "Fake",
        second: "Ethereum",
        third: 457899,
        fourth: 400000,
        fifth: 15,
        sixth: "Cryptoexlock",
        seventh: 755555000,
        eighth: 23,
        ninth: 700
      },
      {
        first: "Fake",
        second: "Ethereum",
        third: 457899,
        fourth: 400000,
        fifth: 15,
        sixth: "Deeplock",
        seventh: 755555000,
        eighth: 23,
        ninth: 700
      },
      {
        first: "safemoon",
        second: "BSC",
        third: 3200000,
        fourth: 100000000,
        fifth: 7,
        sixth: "Unicrypt",
        seventh: 23457777,
        eighth: 122,
        ninth: 13569000
      },
      {
        first: "Fake",
        second: "Ethereum",
        third: 457899,
        fourth: 400000,
        fifth: 15,
        sixth: "Unilocker",
        seventh: 755555000,
        eighth: 23,
        ninth: 700
      },
      {
        first: "Fake",
        second: "Ethereum",
        third: 457899,
        fourth: 400000,
        fifth: 15,
        sixth: "Unicrypt",
        seventh: 755555000,
        eighth: 23,
        ninth: 700
      },
      {
        first: "Fake",
        second: "Ethereum",
        third: 457899,
        fourth: 400000,
        fifth: 15,
        sixth: "Trustswap",
        seventh: 755555000,
        eighth: 23,
        ninth: 700
      },
      {
        first: "safemoon",
        second: "BSC",
        third: 3200000,
        fourth: 100000000,
        fifth: 7,
        sixth: "Unicrypt",
        seventh: 23457777,
        eighth: 122,
        ninth: 13569000
      },
      {
        first: "Fake",
        second: "Ethereum",
        third: 457899,
        fourth: 400000,
        fifth: 15,
        sixth: "Pinksale",
        seventh: 755555000,
        eighth: 23,
        ninth: 700
      }
    ],
    [tokenInfo]
  );

  return <Actiontable columns={columns} data={data} />;
}

export default Table;
