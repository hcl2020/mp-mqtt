let connect = require('mqtt/lib/connect');

module.exports = connect;
module.exports.connect = connect;
module.exports.MqttClient = connect.MqttClient;
module.exports.Store = connect.Store;
