import createDebug from 'debug';

let storage = {
  setItem(key: string, value: string) {
    wx.setStorageSync(key, value);
  },
  getItem(key: string) {
    return wx.getStorageSync(key);
  },
  removeItem(key: string) {
    wx.removeStorageSync(key);
  }
};

// @ts-ignore
createDebug.load = function load() {
  let flag: any;
  try {
    flag = storage.getItem('debug');
    if (!flag && typeof process !== 'undefined') {
      flag = process.env?.DEBUG;
    }
  } catch (error) {}
  return flag;
};

// @ts-ignore
createDebug.save = function save(namespaces?: string) {
  try {
    if (namespaces) {
      storage.setItem('debug', namespaces);
    } else {
      storage.removeItem('debug');
    }
  } catch (error) {}
};

// @ts-ignore
createDebug.enable(createDebug.load());

export default createDebug;
