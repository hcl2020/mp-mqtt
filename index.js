let connect = require('./lib');

module.exports = connect;
module.exports.connect = connect;
module.exports.MqttClient = connect.MqttClient;
module.exports.Store = connect.Store;
