require('dotenv').config()
const OutpostWorker = require('./src/OutpostWorker')

const worker = new OutpostWorker().start();