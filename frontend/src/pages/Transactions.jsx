import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TransactionList() {
  const [month, setMonth] = useState('3'); // Default to March
  const [year, setYear] = useState('2022'); // Default to 2021
  const [transactions, setTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(10); // Transactions per page
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false); // Toggle for "Show All" transactions

  // Fetch transactions whenever month, year, page, search, or showAll changes
  useEffect(() => {
    fetchTransactions();
  }, [month, year, currentPage, search, showAll]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Prepare parameters for API call
      const params = {
        page: currentPage,
        perPage,
        search: search || '',
      };

      // Only add month and year to params if not showing all transactions
      if (!showAll) {
        params.month = month;
        params.year = year;
      }

      const response = await axios.get(`http://localhost:5000/api/transactions`, { params });
      setTransactions(response.data.transactions);
      setTotalPages(response.data.totalPages);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to fetch transactions');
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value); // Update search query
    setCurrentPage(1); // Reset to first page on search
  };

  const handleMonthChange = (e) => {
    setMonth(e.target.value); // Update selected month
    setShowAll(false); // Ensure we are not in "Show All" mode when a month is selected
    setCurrentPage(1); // Reset to first page on month change
  };

  const handleYearChange = (e) => {
    setYear(e.target.value); // Update selected year
    setShowAll(false); // Ensure we are not in "Show All" mode when a year is selected
    setCurrentPage(1); // Reset to first page on year change
  };

  const handleShowAllTransactions = () => {
    setShowAll(true); // Toggle to "Show All" mode
    setCurrentPage(1); // Reset to first page when showing all transactions
  };

  const handleFilterByMonthYear = () => {
    setShowAll(false); // Go back to filtering by month and year
    setCurrentPage(1); // Reset to first page when switching back to filtered mode
  };

  return (
    <div className="container my-4">
      <h2 className="text-center">Transaction List</h2>

      {/* Select Month Dropdown */}
      <div className="form-group">
        <label htmlFor="month-select">Select Month:</label>
        <select
          id="month-select"
          className="form-control"
          value={month}
          onChange={handleMonthChange}
          disabled={showAll} // Disable when "Show All" mode is active
        >
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index} value={index + 1}>
              {new Date(0, index).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
      </div>

      {/* Select Year Dropdown */}
      <div className="form-group">
        <label htmlFor="year-select">Select Year:</label>
        <select
          id="year-select"
          className="form-control"
          value={year}
          onChange={handleYearChange}
          disabled={showAll} // Disable when "Show All" mode is active
        >
          {Array.from({ length: 5 }, (_, index) => (
            <option key={index} value={2021 + index}>
              {2021 + index}
            </option>
          ))}
        </select>
      </div>

      {/* Search Transactions */}
      <div className="form-group">
        <label htmlFor="search-box">Search Transactions:</label>
        <input
          type="text"
          id="search-box"
          className="form-control"
          value={search}
          onChange={handleSearch}
          placeholder="Search by title, description, or price"
        />
      </div>

      {/* Show All Transactions Button */}
      <div className="form-group">
        {showAll ? (
          <button
            className="btn btn-secondary"
            onClick={handleFilterByMonthYear} // Button to return to month/year filtering
          >
            Filter by Month/Year
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleShowAllTransactions}
          >
            Show All Transactions
          </button>
        )}
      </div>

      {/* Display transactions or loader */}
      {loading ? (
        <div className="text-center">Loading...</div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <>
          <table className="table table-striped mt-4">
            <thead>
              <tr>
                <th>Title</th>
                <th>Description</th>
                <th>Price</th>
                <th>Date of Sale</th>
                <th>Sold Status</th>
                <th>images</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map(transaction => (
                  <tr key={transaction._id}>
                    <td>{transaction.title}</td>
                    <td>{transaction.description}</td>
                    <td>{transaction.price.toFixed(2)}</td>
                    <td>{new Date(transaction.dateOfSale).toLocaleDateString()}</td>
                    <td>{transaction.sold ? 'Yes' : 'No'}</td>
                    <td>
                      <img src={transaction.image} width={190} height={200} alt="" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center">No transactions found</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination controls */}
          <div className="d-flex justify-content-between mt-4">
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              className="btn btn-secondary"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default TransactionList;
