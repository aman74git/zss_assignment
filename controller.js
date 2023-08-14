const { MongoClient } = require('mongodb');

const getClient = async () => {
  const client = await MongoClient.connect('mongodb://localhost:27017/', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  return client;
};

const getUntaxedAmount = () => {
  const Untaxed_amount = {
    $divide: [
      '$items.amount',
      {
        $add: [
          1,
          {
            $divide: [
              {
                $add: [
                  '$items.gst_code.gst_rate',
                  '$items.gst_code.cgst_rate',
                  '$items.gst_code.igst_rate',
                  '$items.gst_code.cess',
                ],
              },
              100,
            ],
          },
        ],
      },
    ],
  };
  return Untaxed_amount;
};

const getRecordsByYearAndMonth = async (yearMonth) => {
  const year = 2000 + Number.parseInt(yearMonth.slice(0, 2));
  const month = Number.parseInt(yearMonth.slice(2, 4)) - 1;

  const agg = [
    {
      $match: {
        status: 'Billed',
        bill_date: {
          $gte: new Date(Date.UTC(year, month)),
          $lt: new Date(Date.UTC(year, month + 1)),
        },
      },
    },
    {
      $unwind: {
        path: '$items',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $group: {
        _id: '$items.gst_code.gst_code',
        Amount: {
          $sum: '$items.amount',
        },
        Untaxed_amount: {
          $sum: getUntaxedAmount(),
        },
        GST_amount: {
          $sum: {
            $multiply: [
              getUntaxedAmount(),
              {
                $divide: ['$items.gst_code.gst_rate', 100],
              },
            ],
          },
        },
        CGST_amount: {
          $sum: {
            $multiply: [
              getUntaxedAmount(),
              {
                $divide: ['$items.gst_code.cgst_rate', 100],
              },
            ],
          },
        },
        IGST_amount: {
          $sum: {
            $multiply: [
              getUntaxedAmount(),
              {
                $divide: ['$items.gst_code.igst_rate', 100],
              },
            ],
          },
        },
        CESS_amount: {
          $sum: {
            $multiply: [
              getUntaxedAmount(),
              {
                $divide: ['$items.gst_code.cess', 100],
              },
            ],
          },
        },
      },
    },
    //here the gst rate is not consistent on datas like somewhere it is "GST 5%" and somewhere it is "GST 5 %" which makes them different.
    // so I am creating normalised GST code by removing spaces
    {
      $project: {
        normalized_gst_code: {
          $reduce: {
            input: { $split: ['$_id', ' '] },
            initialValue: '',
            in: {
              $concat: ['$$value', '$$this'],
            },
          },
        },
        Amount: 1,
        Untaxed_amount: 1,
        GST_amount: 1,
        CGST_amount: 1,
        IGST_amount: 1,
        CESS_amount: 1,
      },
    },
    {
      $group: {
        _id: '$normalized_gst_code',
        Amount: {
          $sum: '$Amount',
        },
        Untaxed_amount: {
          $sum: '$Untaxed_amount',
        },
        GST_amount: {
          $sum: '$GST_amount',
        },
        CGST_amount: {
          $sum: '$CGST_amount',
        },
        IGST_amount: {
          $sum: '$IGST_amount',
        },
        CESS_amount: {
          $sum: '$CESS_amount',
        },
      },
    },
  ];

  try {
    const client = await getClient();
    const coll = client.db('testing').collection('bills');
    const cursor = coll.aggregate(agg);
    const result = await cursor.toArray();
    await client.close();

    console.log(result ? result[0]._id : '');

    return result;
  } catch (err) {
    throw err;
  }
};

module.exports = { getRecordsByYearAndMonth };
