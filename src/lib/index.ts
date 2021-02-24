import { MqttClient as IMqttClient, Store as IStore, IClientOptions } from 'mqtt';
import createDebug from 'debug';
import * as url from 'url';
import { buildStream as wxProtocol } from './wx';

type IMqttClientConstructor = typeof IMqttClient;
type IStoreConstructor = typeof IStore;

let MqttClient: IMqttClientConstructor = require('mqtt/lib/client');
let Store: IStoreConstructor = require('mqtt/lib/store');
let debug = createDebug('mqttjs');

// TODO:兼容wx和ws协议
let protocols: Record<string, typeof wxProtocol | undefined> = {
  wx: wxProtocol,
  wxs: wxProtocol,
  ali: require('mqtt/lib/connect/ali'),
  alis: require('mqtt/lib/connect/ali'),
  ws: require('mqtt/lib/connect/ws'),
  wss: require('mqtt/lib/connect/ws')
};

/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 */
function parseAuthOptions(opts: any) {
  let matches;
  if (opts.auth) {
    matches = opts.auth.match(/^(.+):(.+)$/);
    if (matches) {
      opts.username = matches[1];
      opts.password = matches[2];
    } else {
      opts.username = opts.auth;
    }
  }
}

/**
 * connect - connect to an MQTT broker.
 *
 * @param {String} [brokerUrl] - url of the broker, optional
 * @param {Object} opts - see MqttClient#constructor
 */
function connect(brokerUrl: any, opts: any): IMqttClient {
  debug('connecting to an MQTT broker...');
  if (typeof brokerUrl === 'object' && !opts) {
    opts = brokerUrl;
    brokerUrl = null;
  }

  opts = opts || {};

  if (brokerUrl) {
    let parsed = url.parse(brokerUrl, true);
    if (parsed.port != null) {
      // @ts-ignore
      parsed.port = Number(parsed.port);
    }

    opts = { ...parsed, ...opts };

    if (opts.protocol === null) {
      throw new Error('Missing protocol');
    }

    opts.protocol = opts.protocol.replace(/:$/, '');
  }

  // merge in the auth options if supplied
  parseAuthOptions(opts);

  // support clientId passed in the query string of the url
  if (opts.query && typeof opts.query.clientId === 'string') {
    opts.clientId = opts.query.clientId;
  }

  if (opts.cert && opts.key) {
    if (opts.protocol) {
      if (['mqtts', 'wss', 'wxs', 'alis'].indexOf(opts.protocol) === -1) {
        switch (opts.protocol) {
          case 'mqtt':
            opts.protocol = 'mqtts';
            break;
          case 'ws':
            opts.protocol = 'wss';
            break;
          case 'wx':
            opts.protocol = 'wxs';
            break;
          case 'ali':
            opts.protocol = 'alis';
            break;
          default:
            throw new Error('Unknown protocol for secure connection: "' + opts.protocol + '"!');
        }
      }
    } else {
      // A cert and key was provided, however no protocol was specified, so we will throw an error.
      throw new Error('Missing secure protocol key');
    }
  }

  if (!protocols[opts.protocol]) {
    let isSecure = ['mqtts', 'wss'].indexOf(opts.protocol) !== -1;
    opts.protocol = ['mqtt', 'mqtts', 'ws', 'wss', 'wx', 'wxs', 'ali', 'alis'].filter(function (key, index) {
      if (isSecure && index % 2 === 0) {
        // Skip insecure protocols when requesting a secure one.
        return false;
      }
      return typeof protocols[key] === 'function';
    })[0];
  }

  if (opts.clean === false && !opts.clientId) {
    throw new Error('Missing clientId for unclean clients');
  }

  if (opts.protocol) {
    opts.defaultProtocol = opts.protocol;
  }

  let client = new MqttClient((client: any) => {
    if (opts.servers) {
      if (!client._reconnectCount || client._reconnectCount === opts.servers.length) {
        client._reconnectCount = 0;
      }

      opts.host = opts.servers[client._reconnectCount].host;
      opts.port = opts.servers[client._reconnectCount].port;
      opts.protocol = !opts.servers[client._reconnectCount].protocol
        ? opts.defaultProtocol
        : opts.servers[client._reconnectCount].protocol;
      opts.hostname = opts.host;

      client._reconnectCount++;
    }

    debug('calling streambuilder for', opts.protocol);
    return protocols[opts.protocol]?.(client, opts);
  }, opts);

  client.on('error', function () {
    /* Automatically set up client error handling */
  });
  return client;
}

export { connect, MqttClient, Store };
