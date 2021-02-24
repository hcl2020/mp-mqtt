import type { MqttClient as IMqttClient, Store as IStore, IClientOptions } from 'mqtt';
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
  ws: require('mqtt/lib/connect/ws'),
  wss: require('mqtt/lib/connect/ws')
};

function getNormalizeProtocol(protocol?: string) {
  // TODO: 根据运行时环境自动处理
  return protocol as 'wx' | 'wxs' | 'ws' | 'wss';
}

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

function connect(opts: IClientOptions): IMqttClient;
function connect(brokerUrl: string, opts?: IClientOptions): IMqttClient;
function connect(opts_or_brokerUrl: IClientOptions | string, _opts?: IClientOptions): IMqttClient {
  debug('connecting to an MQTT broker...');

  let brokerUrl: null | string = null;
  let opts: IClientOptions & { query?: any } = {};

  if (typeof opts_or_brokerUrl === 'string') {
    brokerUrl = opts_or_brokerUrl;
    opts = _opts || {};
  } else {
    opts = opts_or_brokerUrl || {};
  }

  if (brokerUrl) {
    let parsed = url.parse(brokerUrl, true);
    if (parsed.port != null) {
      // @ts-ignore
      parsed.port = Number(parsed.port);
    }

    opts = { ...parsed, ...opts } as IClientOptions;

    if (opts.protocol === null || opts.protocol === undefined) {
      throw new Error('Missing protocol');
    }

    opts.protocol = opts.protocol.replace(/:$/, '') as any;
  }

  // merge in the auth options if supplied
  parseAuthOptions(opts);

  // support clientId passed in the query string of the url

  if (opts.query && typeof opts.query.clientId === 'string') {
    opts.clientId = opts.query.clientId;
  }

  if (opts.clean === false && !opts.clientId) {
    throw new Error('Missing clientId for unclean clients');
  }

  let defaultProtocol = opts.protocol;
  if (!opts.protocol || typeof protocols[opts.protocol] !== 'function') {
    throw new Error('不支持的协议');
  }

  let _client = new MqttClient((client: any): any => {
    if (opts.servers) {
      if (!client._reconnectCount || client._reconnectCount === opts.servers.length) {
        client._reconnectCount = 0;
      }

      let server = opts.servers[client._reconnectCount];
      if (server) {
        opts.host = server.host;
        opts.port = server.port;
        opts.protocol = getNormalizeProtocol(server.protocol || defaultProtocol);
        opts.hostname = opts.host;
      }
      client._reconnectCount++;
    }

    debug('calling streambuilder for', opts.protocol);
    return protocols[opts.protocol!]?.(client, opts);
  }, opts);

  _client.on('error', function () {
    /* Automatically set up client error handling */
  });
  return _client;
}

export { connect, MqttClient, Store };
