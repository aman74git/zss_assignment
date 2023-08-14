const express = require('express');
const { getRecordsByYearAndMonth } = require('./controller');

const app = express();

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Healthy server' });
});

app.get('/records/:yearMonth', async (req, res) => {
  const { yearMonth } = req.params;
  try {
    const records = await getRecordsByYearAndMonth(yearMonth);
    return res.status(200).json({
      message: 'Records fetched successfully',
      records,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.all('*', (req, res) => {
  res.status(404).json({ message: 'Page Not found' });
});

app.listen(5000, () => {
  console.log('Server started on port 5000');
});
