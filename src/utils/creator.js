import loader from './loader';
import parser from './parser';
/**
 * 加载图片资源
 * @param {string|Array} src 资源地址
 * @param {boolean} cache 是否启用缓存
 */
function createFrames (src, cache) {
    const urls = src instanceof Array ? src : [src];
    return Promise.all(urls.map(url => {
        return new Promise(resolve => {
            const source = loadSource(url, cache);
            source.then(res => {
                // TODO
                // if (hasCache) {
                    
                // }
                parseSource(res, url, cache).then(apng => {
                    resolve(apng);
                })
            });
        });
    }))
}
function loadSource(url, cache) {
    // 启用缓存时优先检索缓存中是否包含已经解析的资源
    if (cache) {
        // TODO
    }
    return loader(url);
}
/**
 * 解析图片
 * @param {ArrayBuffer} res 图片二进制资源
 * @param {string} url 资源地址
 * @param {boolean} cache 是否缓存
 */
async function parseSource (res, url, cache = false) {
    const apng = await parser(res);
    if (cache) {
        // TODO
    }
    return apng;

}

export default createFrames;