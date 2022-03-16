import React, { useEffect, useState, useCallback, useRef } from "react";
import { useTable, useGlobalFilter, useAsyncDebounce, useSortBy, usePagination } from "react-table";
// import Bootstrap from 'bootstrap/dist/css/bootstrap.min.css';
import { ProgressBar } from "react-bootstrap";
import '../Style/style.css';
import Axios from "axios";
import { createClient } from 'urql';
import { useNavigate, useParams } from "react-router-dom";
import $ from "jquery";

async function ETH_price() {
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
  return ethData.data.bundle.ethPrice;
}


async function BNB_price() {
  let bnbprice;
  await Axios.get(`https://api.pancakeswap.info/api/v2/tokens/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c`).then(entry =>
    bnbprice = entry.data.data.price);
  return bnbprice;
}


const scan_link = {
  Ethereum: "https://etherscan.io/",
  BSC: "https://bscscan.com/"
};

function GlobalFilter({
  preGlobalFilteredRows,
  globalFilter,
  setGlobalFilter
}) {
  const count = preGlobalFilteredRows.length;
  const [value, setValue] = useState(globalFilter);
  const onChange = useAsyncDebounce(async (value) => {
    setGlobalFilter(value || undefined);
  }, 200);

  return (
    <span>
      Search: {" "}
      <input id="filterRecords"
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

// function ProgressInstance(props) {
//   const {now} = props;
//   return (
//     <div className={now > 0.5 ? "progress1" : "progress2"}>
//       <ProgressBar now={now * 100} />
//     </div>
//   );
// }

// function ProgressInstance(props) {
//   return (
//     <div className={props.now > 0.5 ? "progress1" : "progress2"}>
//       <ProgressBar now={props.now * 100} />
//     </div>
//   );
// }

function ProgressInstance({ now }) {
  return (
    <div className={now > 0.5 ? "progress1" : "progress2"}>
      <ProgressBar now={now * 100} />
    </div>
  );
}

function Actiontable({ columns, data, pageNo, rowsNum, fetchData, pageCount: controlledPageCount }) {
  const navigate = useNavigate();

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    // footerGroups,
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
      initialState: { pageSize: rowsNum, pageIndex: pageNo },
      manualPagination: true,
      pageCount: controlledPageCount
    },
    useGlobalFilter, useSortBy, usePagination
  );

  useEffect(() => {
    navigate("/" + Number(pageIndex + 1) + "/" + pageSize);
    // navigate("/records/" + Number(pageIndex + 1)  + "/" + pageSize);

    // const dosth = () => {
    //   Axios
    //   .get("http://localhost:5000/record/", {params: {page: pageIndex, rows: pageSize}})
    //   .then((response) => {
    //     setRecords(response.data);
    //     setTimeout(dosth, 120000);
    //   })
    //   .catch(function (error) {
    //     console.log(error);
    //   });
    // }
    // dosth();
    // return () => clearTimeout(dosth);

    fetchData({ pageIndex, pageSize, searchTerm: $("#filterRecords").val() });

  }, [$("#filterRecords").val(), pageIndex, pageSize]);

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
                  {group.headers.map((column, i) => (
                    <th {...column.getHeaderProps(column.getSortByToggleProps())}>{column.render("Header")}
                      <span>{
                        column.isSorted
                          ? column.isSortedDesc
                            ? ' 🔽'
                            : ' 🔼'
                          : ''
                      }</span>
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
                    {row.cells.map((cell, j) => {
                      if (j === 0) {
                        return <td key={j}><a href={row.values.third === 'BSC' ? scan_link['BSC'] + "token/" + row.values.first[1] : scan_link['Ethereum'] + "token/" + row.values.first[1]} target="_blank">{row.values.first[0]}</a></td>
                      }
                      else if (j === 1) {
                        return <td key={j}><a href={row.values.third === 'BSC' ? scan_link['BSC'] + "address/" + row.values.second[1] : scan_link['Ethereum'] + "address/" + row.values.second[1]} target="_blank">{row.values.second[0]}</a></td>
                      }
                      else if (j === 5) {
                        return <td key={j}>{row.values.sixth[0]}</td>
                      }
                      else if (j === 6) {
                        return <td key={j}>{row.values.seventh}<ProgressInstance now={row.values.sixth[1]} /></td>
                      }
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
          <div className="leftpagebar">
            <button onClick={() => {
              gotoPage(0);
              // setPageIndex(0);
            }} disabled={!canPreviousPage}>
              {"<<"}
            </button>{" "}
            <button onClick={() => {
              previousPage()
              // setPageIndex(pageIndex - 1);
            }} disabled={!canPreviousPage}>
              {"<"}
            </button>{" "}
            <button onClick={() => {
              nextPage()
              // setPageIndex(pageIndex + 1);
            }} disabled={!canNextPage}>
              {">"}
            </button>{" "}
            <button onClick={() => {
              gotoPage(pageCount - 1)
              // setPageIndex(pageCount - 1);
            }} disabled={!canNextPage}>
              {">>"}
            </button>{" "}

            <span>
              Page{" "}
              <strong id="showPage">
                {Number(pageIndex) + 1} of {pageCount}
              </strong>{" "}
            </span>
          </div>
          <div className="righttpagebar">
            <span>
              Go to page:{" "}
              <input
                type="number"
                defaultValue={Number(pageIndex) + 1}
                onChange={(e) => {
                  const page = e.target.value ? Number(e.target.value) - 1 : 0;
                  gotoPage(page);
                }}
                style={{ width: "70px" }}
              />
            </span>{" "}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
              }}
            >
              {[10, 20, 30, 40].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </>
  );
}

function Table() {
  let { page, rows } = useParams();
  page = !page ? 0 : Number(page) - 1;
  rows = !rows ? 10 : Number(rows);

  const [records, setRecords] = useState([]);
  const [pageCount, setPageCount] = useState(0);

  const [ethprice, setEthprice] = useState(0);
  const [bnbprice, setBnbprice] = useState(0);


  // const [searchTerm, setSearchTerm] = useState("");
  const fetchIdRef = useRef(0);
  let totalRecords;

  const fetchData = useCallback(({ pageSize, pageIndex, searchTerm }) => {
    // Give this fetch an ID
    const fetchId = ++fetchIdRef.current;
    // We'll even set a delay to simulate a server here

    // setTimeout(async () => {
    //   // Only update the data if this is the latest fetch
    //   if (fetchId === fetchIdRef.current) {
    //   await Axios
    //   .get("http://localhost:5000/record/", {params: {page: pageIndex, rows: pageSize, search: searchTerm}})
    //   .then((response) => {
    //     totalRecords = response.data[response.data.length-1];
    //     response.data.pop();
    //     setRecords(response.data);
    //   })
    //   .catch(function (error) {
    //     console.log(error);
    //   });

    //     setPageCount(Math.ceil(totalRecords / pageSize));
    //   }
    // }, 1000)

    const dosth = async () => {
      setEthprice(ETH_price());
      setBnbprice(BNB_price());

      if (fetchId === fetchIdRef.current) {
        await Axios
          .get("http://localhost:5000/record/", { params: { page: pageIndex, rows: pageSize, search: searchTerm } })
          .then((response) => {
            totalRecords = response.data[response.data.length - 1];
            response.data.pop();
            setRecords(response.data);
            setTimeout(dosth, 120000);
          })
          .catch(function (error) {
            console.log(error);
          });

        setPageCount(Math.ceil(totalRecords / pageSize));
      }
    }
    dosth();
    return () => clearTimeout(dosth);
  }, []);

  const columns = React.useMemo(
    () => [
      {
        Header: "TokenName",
        accessor: "first"
      },
      {
        Header: "PairToken",
        accessor: "second"
      },
      {
        Header: "Blockchain",
        accessor: "third"
      },
      {
        Header: "Liquidity Locked $",
        accessor: "fourth"
      },
      {
        Header: "Tokens Locked %",
        accessor: "fifth"
      },
      {
        Header: "Locked Date",
        accessor: "sixth"
      },
      {
        Header: "Time to unlock",
        accessor: "seventh"
      },
      {
        Header: "Locker",
        accessor: "eighth"
      },
      {
        Header: "Marketcap $",
        accessor: "ninth"
      },
      {
        Header: "Coin gecko Rank #",
        accessor: "tenth"
      },
      {
        Header: "Score",
        accessor: "eleventh"
      }
    ],
    []
  );

  const data = React.useMemo(
    () => {
      let tokensInfo = [];
      // let ethprice;
      // let bnbprice;

      // let apiurls = [`https://api.coingecko.com/api/v3/coins/ethereum/contract/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2`,
      //                 `https://api.coingecko.com/api/v3/coins/binance-smart-chain/contract/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c`];

      // Promise.all(apiurls.map(apiurl => fetch(apiurl))).then(responses => responses.forEach(response => {console.log(response)}));


      // const APIURL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2';
      // const ethpriceQuery = `
      //     query {
      //       bundle(id: "1" ) {
      //         ethPrice
      //       }
      //     }
      //   `;

      // const client = createClient({
      //   url: APIURL,
      // });
      // const ethData = await client.query(ethpriceQuery).toPromise();
      // let ethPrice = ethData.data.bundle.ethPrice;


      // await Axios.get(`https://api.pancakeswap.info/api/v2/tokens/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c`).then(entry => 
      //   bnbprice = entry.data.data.price);


      function unlockTime(unlock_time) {
        let time_basedDate = (Date.parse(unlock_time) - Date.now()) / 86400000;

        if (time_basedDate >= 365) {
          return (time_basedDate / 365).toFixed(0) + " years left";
        }
        else if (time_basedDate >= 30 && time_basedDate < 365) {
          return (time_basedDate / 30).toFixed(0) + " months left";
        }
        else if (time_basedDate >= 0 && time_basedDate < 30) {
          return time_basedDate.toFixed(0) + " days left";
        }
        else {
          return 0 + " days left";
        }
      }

      console.log(ethprice);
      console.log(bnbprice);

      function liquidity_locked(symbol, amount) {
        if (symbol == "WETH") {
          return amount * ethprice * 2;
        }
        else if (symbol == "WBNB") {
          return amount * bnbprice * 2;
        }
        else {
          return amount * 2;
        }
      }


      records.map((record) => {
        tokensInfo.push(
          {
            first: [record.TokenName, record.TokenAddress],
            second: [record.PairToken, record.PairTokenAddress],
            third: record.Blockchain,
            fourth: "$" + liquidity_locked(record.NativeSymbol, record.NativeAmount),
            fifth: (record.Tokens_Locked > 1000000000 ? (record.Tokens_Locked / 1000000000).toFixed(3) + " B" : record.Tokens_Locked) + " (" + record.Liquidity_Percentage * 100 + "%)",
            sixth: [record.Locked_Date, (Date.now() < Date.parse(record.Time_to_unlock) ? (Date.now() - Date.parse(record.Locked_Date)) / (Date.parse(record.Time_to_unlock) - Date.parse(record.Locked_Date)) : 1)],
            seventh: unlockTime(record.Time_to_unlock),
            eighth: record.Locker,
            ninth: "$" + record.Marketcap,
            tenth: record.Coingecko_Rank,
            eleventh: (liquidity_locked(record.NativeSymbol, record.NativeAmount) * parseFloat(record.Liquidity_Percentage) * parseFloat(record.Time_to_unlock)).toFixed(1)
          }
        );
      });
      return tokensInfo;
    },
    [records]
  );

  return <Actiontable columns={columns} data={data} pageNo={page} rowsNum={rows} fetchData={fetchData} pageCount={pageCount} />;
}

export default Table;
