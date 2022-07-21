const OutpostHttpServer = require('./src/OutpostHttpServer')
const OutpostWorker = require('./src/OutpostWorker')

const worker = new OutpostWorker()
const httpServer = new OutpostHttpServer(worker)

worker.start()
httpServer.start()
