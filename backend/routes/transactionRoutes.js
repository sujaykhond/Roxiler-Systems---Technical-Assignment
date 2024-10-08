const express = require('express');
const axios = require('axios');
const Transaction = require('../models/Transaction');

const router = express.Router();

// Utility function to handle date range queries
const getDateRange = (month, year) => {
  if (!year || isNaN(year)) throw new Error('Invalid or missing year');
  if (!month || isNaN(month) || month < 1 || month > 12) throw new Error('Invalid month provided');
  
  const startDate = new Date(`${year}-${month}-01`);
  const endDate = new Date(year, month, 0);
  
  return { startDate, endDate };
};

// Fetch and seed the database
router.get('/seed', async (req, res) => {
  try {
    const { data: transactions } = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    await Transaction.insertMany(transactions);
    res.status(201).json({ message: 'Database seeded successfully!' });
  } catch (error) {
    console.error('Error seeding database:', error.message);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

// List all transactions with search and pagination
router.get('/', async (req, res) => {
  const { page = 1, perPage = 10, search = '', month, year, reset } = req.query;

  try {
    const query = {};
    let dateQuery = {};

    // If reset is true, fetch all transactions without filters
    if (reset) {
      // Fetch all transactions without filters
    } else {
      // If month and year are provided, calculate the date range
      if (month && year) {
        const { startDate, endDate } = getDateRange(month, year);
        dateQuery = { dateOfSale: { $gte: startDate, $lte: endDate } };
      }

      // Build search query with title, description, or price
      const searchConditions = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];

      if (!isNaN(search)) {
        searchConditions.push({ price: Number(search) });
      }

      query.$and = [dateQuery, { $or: searchConditions }];
    }

    // Fetch paginated transactions
    const transactions = await Transaction.find(query)
      .skip((page - 1) * perPage)
      .limit(parseInt(perPage));

    const totalTransactions = await Transaction.countDocuments(query);

    res.json({
      transactions,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalTransactions / perPage),
      totalTransactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get statistics for a selected month
router.get('/statistics', async (req, res) => {
  const { month, year } = req.query;

  try {
    const { startDate, endDate } = getDateRange(month, year);

    const [totalSales, totalSoldItems, totalNotSoldItems] = await Promise.all([
      Transaction.aggregate([
        { $match: { dateOfSale: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: "$price" } } }
      ]),
      Transaction.countDocuments({ dateOfSale: { $gte: startDate, $lte: endDate }, sold: true }),
      Transaction.countDocuments({ dateOfSale: { $gte: startDate, $lte: endDate }, sold: false })
    ]);

    res.json({
      totalSales: totalSales.length ? totalSales[0].total : 0,
      totalSoldItems,
      totalNotSoldItems
    });
  } catch (error) {
    console.error('Error fetching statistics:', error.message);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get bar chart data based on price ranges
router.get('/bar-chart', async (req, res) => {
  const { month, year } = req.query;

  try {
    const { startDate, endDate } = getDateRange(month, year);

    const barChartData = await Transaction.aggregate([
      { $match: { dateOfSale: { $gte: startDate, $lte: endDate } } },
      {
        $bucket: {
          groupBy: "$price",
          boundaries: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, Infinity],
          default: "Other",
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    res.json(barChartData);
  } catch (error) {
    console.error('Error fetching bar chart data:', error.message);
    res.status(500).json({ error: 'Failed to fetch bar chart data' });
  }
});

// Get pie chart data by category
router.get('/pie-chart', async (req, res) => {
  const { month, year } = req.query;

  try {
    const { startDate, endDate } = getDateRange(month, year);

    const pieChartData = await Transaction.aggregate([
      { $match: { dateOfSale: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.json(pieChartData);
  } catch (error) {
    console.error('Error fetching pie chart data:', error.message);
    res.status(500).json({ error: 'Failed to fetch pie chart data' });
  }
});

// Get combined data from statistics, bar chart, and pie chart
router.get('/combined', async (req, res) => {
  const { month, year } = req.query;

  try {
    const { startDate, endDate } = getDateRange(month, year);

    const [totalSales, totalSoldItems, totalNotSoldItems, barChartData, pieChartData] = await Promise.all([
      Transaction.aggregate([
        { $match: { dateOfSale: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: "$price" } } }
      ]),
      Transaction.countDocuments({ dateOfSale: { $gte: startDate, $lte: endDate }, sold: true }),
      Transaction.countDocuments({ dateOfSale: { $gte: startDate, $lte: endDate }, sold: false }),
      Transaction.aggregate([
        { $match: { dateOfSale: { $gte: startDate, $lte: endDate } } },
        {
          $bucket: {
            groupBy: "$price",
            boundaries: [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, Infinity],
            default: "Other",
            output: { count: { $sum: 1 } }
          }
        }
      ]),
      Transaction.aggregate([
        { $match: { dateOfSale: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: "$category", count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      totalSales: totalSales.length ? totalSales[0].total : 0,
      totalSoldItems,
      totalNotSoldItems,
      barChartData,
      pieChartData
    });
  } catch (error) {
    console.error('Error fetching combined data:', error.message);
    res.status(500).json({ error: 'Failed to fetch combined data' });
  }
});

// Get a single transaction by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const transaction = await Transaction.findById(id.trim());
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    
    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error.message);
    res.status(500).json({ error: 'Failed to fetch transaction' });
  }
});

module.exports = router;
