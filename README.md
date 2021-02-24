<p>
  <h1 align="center">mp-mqtt</h1>
  <p align="center">微信小程序版 mqtt</p>
</p>

<p align="center">
  <a href="https://github.com/hcl2020/mp-mqtt">
    <img src="https://img.shields.io/github/issues/hcl2020/mp-mqtt?style=flat-square&logo=github&color=000">
  </a>
  <a href="https://npmcharts.com/compare/mp-mqtt?minimal=true">
    <img src="https://img.shields.io/npm/dm/mp-mqtt.svg?style=flat-square&color=026" alt="Downloads">
  </a>
  <a href="https://www.npmjs.com/package/mp-mqtt">
    <img src="https://img.shields.io/npm/v/mp-mqtt.svg?style=flat-square&color=049" alt="Version">
  </a>
  <a href="https://www.npmjs.com/package/mp-mqtt">
    <img src="https://img.shields.io/npm/l/mp-mqtt.svg?style=flat-square&color=06c" alt="License">
  </a>
</p>

基于 [MQTT.js](https://github.com/mqttjs/MQTT.js) 构建，解决 **v4.x** 版本的 [mqtt](https://www.npmjs.com/package/mqtt/v/4.2.6) 不能在微信小程序中正常连接服务器的问题。

- 支持基于 webpack 的构建工具导入(uniapp)。
- ~~支持原生微信小程序的 npm 构建工具。~~
- ~~更小的打包体积~~
- 支持 typescript。
- 支持使用 [微信 Storage](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/storage.html) 配置开启 [debug](https://www.npmjs.com/package/debug) 日志

## 使用

与[mqtt](https://www.npmjs.com/package/mqtt/v/4.2.6) api 保持一致, 但是仅支持 wxs 和 wx 协议。

MIT © [AmazingPromise](https://github.com/hcl2020)
