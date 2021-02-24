import { Transform } from 'readable-stream';
import * as duplexify from 'duplexify';

/* global wx */
var socketTask: any;
var proxy: any;
var stream: any;

function buildProxy() {
  var proxy = new Transform();
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
  var protocol = opts.protocol === 'wxs' ? 'wss' : 'ws';
  var url = protocol + '://' + opts.hostname + opts.path;
  if (opts.port && opts.port !== 80 && opts.port !== 443) {
    url = protocol + '://' + opts.hostname + ':' + opts.port + opts.path;
  }
  if (typeof opts.transformWsUrl === 'function') {
    url = opts.transformWsUrl(url, opts, client);
  }
  return url;
}

function bindEventHandler() {
  socketTask.onOpen(function () {
    stream.setReadable(proxy);
    stream.setWritable(proxy);
    stream.emit('connect');
  });

  socketTask.onMessage(function (res: any) {
    var data = res.data;

    // data = data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data, 'utf8');

    // data._isBuffer = true;
    // data = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
    data = new Uint8Array(data);

    proxy.push(data);
  });

  socketTask.onClose(function () {
    stream.end();
    stream.destroy();
  });

  socketTask.onError(function (res: any) {
    stream.destroy(new Error(res.errMsg));
  });
}

function buildStream(client: any, opts: any) {
  opts.hostname = opts.hostname || opts.host;

  if (!opts.hostname) {
    throw new Error('Could not determine host. Specify host manually.');
  }

  var websocketSubProtocol = opts.protocolId === 'MQIsdp' && opts.protocolVersion === 3 ? 'mqttv3.1' : 'mqtt';

  setDefaultOpts(opts);

  var url = buildUrl(opts, client);
  socketTask = wx.connectSocket({
    url: url,
    protocols: [websocketSubProtocol]
  });

  proxy = buildProxy();
  stream = duplexify.obj();
  stream._destroy = function (err: any, cb: any) {
    socketTask.close({
      success: function () {
        cb && cb(err);
      }
    });
  };

  var destroyRef = stream.destroy;
  stream.destroy = function () {
    stream.destroy = destroyRef;

    setTimeout(() => {
      socketTask.close({
        fail: function () {
          this._destroy(new Error());
        }
      });
    }, 0);
  }.bind(stream);

  bindEventHandler();

  return stream;
}

export { buildStream };
export default buildStream;
