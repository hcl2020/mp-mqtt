import type { MqttClient as IMqttClient, IClientOptions } from 'mqtt';
import { Transform } from 'readable-stream';
import * as duplexify from 'duplexify';

/* global wx */
let socketTask: WechatMiniprogram.SocketTask;
let proxy: Transform;
let stream: duplexify.Duplexify;

function buildProxy() {
  let proxy = new Transform();
  proxy._write = function (chunk, encoding, next) {
    socketTask.send({
      data: chunk, // .buffer,
      success: function () {
        next();
      },
      fail: function (errMsg: any) {
        next(new Error(errMsg));
      }
    });
  };
  proxy._flush = function socketEnd(done) {
    socketTask.close({
      success: function () {
        done();
      }
    });
  };

  return proxy;
}

function setDefaultOpts(opts: any) {
  if (!opts.hostname) {
    opts.hostname = 'localhost';
  }
  if (!opts.path) {
    opts.path = '/';
  }

  if (!opts.wsOptions) {
    opts.wsOptions = {};
  }
}

function buildUrl(opts: any, client: any) {
  let protocol = opts.protocol === 'wxs' ? 'wss' : 'ws';
  let url = protocol + '://' + opts.hostname + opts.path;
  if (opts.port && opts.port !== 80 && opts.port !== 443) {
    url = protocol + '://' + opts.hostname + ':' + opts.port + opts.path;
  }
  if (typeof opts.transformWsUrl === 'function') {
    url = opts.transformWsUrl(url, opts, client);
  }
  return url;
}

function bindEventHandler() {
  socketTask.onOpen(() => {
    stream.setReadable(proxy);
    stream.setWritable(proxy);
    stream.emit('connect');
  });

  socketTask.onMessage((res: any) => {
    let data = res.data;

    // data = data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data, 'utf8');

    // data._isBuffer = true;
    // data = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    data = new Uint8Array(data);

    proxy.push(data);
  });

  socketTask.onClose(() => {
    stream.end();
    stream.destroy();
  });

  socketTask.onError((res: any) => {
    stream.destroy(new Error(res.errMsg));
  });
}

function buildStream(client: IMqttClient, opts: IClientOptions) {
  opts.hostname = opts.hostname || opts.host;

  if (!opts.hostname) {
    throw new Error('Could not determine host. Specify host manually.');
  }

  let websocketSubProtocol = opts.protocolId === 'MQIsdp' && opts.protocolVersion === 3 ? 'mqttv3.1' : 'mqtt';

  setDefaultOpts(opts);

  let url = buildUrl(opts, client);
  socketTask = wx.connectSocket({ url, protocols: [websocketSubProtocol] });

  proxy = buildProxy();
  stream = duplexify.obj();

  stream._destroy = function _destroy(err: Error | null, cb: (error: Error | null) => void) {
    socketTask.close({
      success() {
        cb && cb(err);
      }
    });
  };

  let destroyRef = stream.destroy;
  stream.destroy = function destroy() {
    stream.destroy = destroyRef;

    setTimeout(() => {
      socketTask.close({
        fail() {
          stream._destroy(new Error(), () => {});
        }
      });
    }, 0);
  }.bind(stream);

  bindEventHandler();

  return stream;
}

export { buildStream };
