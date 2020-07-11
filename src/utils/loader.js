// 请求图片资源放回二进制流数据
export default function (url) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'arraybuffer';
        xhr.timeout = 10000;
        xhr.onload = function () {
            if (this.readyState === 4) {
                resolve(this.response);
            } else {
                reject('图片资源获取失败');
            }
        };
        xhr.ontimeout = function () {
            reject('图片资源获取失败');
        }
        xhr.send();
    });
};