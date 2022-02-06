import React, {useEffect, useState} from "react";
import { useTable, useGlobalFilter, useAsyncDebounce, useSortBy, usePagination } from "react-table";
import '../Style/style.css';
import Axios from "axios";

function GlobalFilter({
  preGlobalFilteredRows,
  globalFilter,
  setGlobalFilter
}) {
  const count = preGlobalFilteredRows.length;
  const [value, setValue] = React.useState(globalFilter);
  const onChange = useAsyncDebounce(async (value) => {
    setGlobalFilter(value || undefined);
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

function Actiontable({ columns, data, pageNo, setPageIndex }) {
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
      initialState: { pageSize: 10, pageIndex: pageNo }
    },
    useGlobalFilter, useSortBy, usePagination
  );

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
          <button onClick={() => {
            gotoPage(0);
            setPageIndex(0);
          }} disabled={!canPreviousPage}>
            {"<<"}
          </button>{" "}
          <button onClick={() => {
            previousPage()
            setPageIndex(pageIndex - 1);
          }} disabled={!canPreviousPage}>
            {"<"}
          </button>{" "}
          <button onClick={() => {
            nextPage()
            setPageIndex(pageIndex + 1);
          }} disabled={!canNextPage}>
            {">"}
          </button>{" "}
          <button onClick={() => {
            gotoPage(pageCount - 1)
            setPageIndex(pageCount - 1);
          }} disabled={!canNextPage}>
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
            {[10, 20, 30, 40].map((pageSize) => (
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

function Table() {
  const [records, setRecords] = useState([]);
  const [pageIndex, setPageIndex] = useState(0);
  useEffect(() => {
    const dosth = () => {
      Axios
      .get("http://localhost:5000/record/")
      .then((response) => {
        setRecords(response.data);
        setTimeout(dosth, 60000);
      })
      .catch(function (error) {
        console.log(error);
      });
    }
    dosth();
    return () => clearTimeout(dosth);
  }, []);

  const columns = React.useMemo(
    () => [
      {
        Header: "Token ↓↑",
        accessor: "first"
      },
      {
        Header: "Blockchain ↓↑",
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
        Header: "Time to unlock ↓↑",
        accessor: "fifth"
      },
      {
        Header: "Locker ↓↑",
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
        Header: "Score ↓↑",
        accessor: "ninth"
      }
    ],
    []
  );
  
  const data = React.useMemo(
    () => {
      if(records.length) {
              let tokensInfo = [];
              records.map((record) => {
                tokensInfo.push(
                  {
                    first:  record.TokenName,
                    second: record.Blockchain,
                    third: "$" + record.Liquidity_Locked,
                    fourth: record.Tokens_Locked + " (" + (record.Tokens_Locked/record.Token_TotalAmount * 100).toFixed(1) + "%)",
                    fifth: record.Time_to_unlock + " days left",
                    sixth: record.Locker,
                    seventh: "$" + record.Marketcap,
                    eighth: record.Coingecko_Rank,
                    ninth: (parseFloat(record.Liquidity_Locked) * parseFloat(record.Tokens_Locked/record.Token_TotalAmount) * parseFloat(record.Time_to_unlock)).toFixed(1)
                  }
                ); 
            });
              return tokensInfo;
            } else { let empty = []; for (let i = 0; i < 10; i++) {
                empty.push(
                  {
                    first: empty[i],
                    second: empty[i],
                    third: empty[i],
                    fourth: empty[i],
                    fifth: empty[i],
                    sixth: empty[i],
                    seventh: empty[i],
                    eighth: empty[i],
                    ninth: empty[i]
                  }
                );
              } return empty; }
          },
        [records]
  );

  return <Actiontable columns={columns} data={data} pageNo={pageIndex} setPageIndex={(pageIndex) => setPageIndex(pageIndex)}/>;
}

export default Table;
