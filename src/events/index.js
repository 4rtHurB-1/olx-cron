const EventEmitter = require('events').EventEmitter;
const pubsub = new EventEmitter();

import cronHandler from './handlers/crawler';

pubsub.on('crawler.execute', cronHandler.onExecute);

export default pubsub;