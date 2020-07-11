import crc32 from './crc32';

// "\x89PNG\x0d\x0a\x1a\x0a"
const PNG_SIGNATURE_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * @param {ArrayBuffer} buffer
 * @return {Promise}
 */
export default function (buffer) {
    const apng = {
        frames: [],
        width: 0,
        height: 0,
        playTime: 0,
        currFrame: 0,
        length: 0,
    };
    const bytes = new Uint8Array(buffer);
    for (let i = 0, len = PNG_SIGNATURE_BYTES.length; i < len; i++) {
        if (PNG_SIGNATURE_BYTES[i] != bytes[i]) {
            throw new Error("Not a PNG file (invalid file signature)");
        }
    }

    // 先判断图片资源是否为动态图片
    let isAnimated = false;
    parseChunks(bytes, function (type) {
        if (type == "acTL") {
            isAnimated = true;
            return false;
        }
        return true;
    });
    if (!isAnimated) {
        throw new Error("Not an animated PNG");
    }

    let
        preDataParts = [],
        postDataParts = [],
        headerDataBytes = null,
        frame = null;
    // 解析动态图片
    parseChunks(bytes, function (type, bytes, off, length) {
        switch (type) {
            case "IHDR":
                headerDataBytes = bytes.subarray(off + 8, off + 8 + length);
                apng.width = getUint32(bytes, off + 8);
                apng.height = getUint32(bytes, off + 12);
                break;
            case "acTL":
                apng.numPlays = getUint32(bytes, off + 8 + 4);
                break;
            case "fcTL":
                if (frame) apng.frames.push(frame);
                frame = {};
                frame.width = getUint32(bytes, off + 8 + 4);
                frame.height = getUint32(bytes, off + 8 + 8);
                frame.left = getUint32(bytes, off + 8 + 12);
                frame.top = getUint32(bytes, off + 8 + 16);
                const delayN = getUint16(bytes, off + 8 + 20);
                const delayD = getUint16(bytes, off + 8 + 22);
                if (delayD == 0) delayD = 100;
                frame.delay = 1000 * delayN / delayD;
                // see http://mxr.mozilla.org/mozilla/source/gfx/src/shared/gfxImageFrame.cpp#343
                if (frame.delay <= 10) frame.delay = 100;
                apng.playTime += frame.delay;
                frame.disposeOp = getUint8(bytes, off + 8 + 24);
                frame.blendOp = getUint8(bytes, off + 8 + 25);
                frame.dataParts = [];
                break;
            case "fdAT":
                if (frame) frame.dataParts.push(bytes.subarray(off + 8 + 4, off + 8 + length));
                break;
            case "IDAT":
                if (frame) frame.dataParts.push(bytes.subarray(off + 8, off + 8 + length));
                break;
            case "IEND":
                postDataParts.push(subBuffer(bytes, off, 12 + length));
                break;
            default:
                preDataParts.push(subBuffer(bytes, off, 12 + length));
        }
    });

    if (frame) apng.frames.push(frame);
    apng.length = apng.frames.length;
    if (apng.length == 0) {
        throw new Error("不是apng动图资源");
    }

    // creating images
    const preBlob = new Blob(preDataParts), postBlob = new Blob(postDataParts);
    return Promise.all(apng.frames.map((item, index) => {
        frame = item;
        var bb = [];
        bb.push(PNG_SIGNATURE_BYTES);
        headerDataBytes.set(makeDWordArray(frame.width), 0);
        headerDataBytes.set(makeDWordArray(frame.height), 4);
        bb.push(makeChunkBytes("IHDR", headerDataBytes));
        bb.push(preBlob);
        Array.prototype.forEach.call(frame.dataParts, item => {
            bb.push(makeChunkBytes("IDAT", item));
        });
        bb.push(postBlob);
        const url = URL.createObjectURL(new Blob(bb, {"type": "image/png"}));
        delete frame.dataParts;
        bb = null;
        return new Promise((resolve, reject) => {
            /**
             * Using "createElement" instead of "new Image" because of bug in Chrome 27
             * https://code.google.com/p/chromium/issues/detail?id=238071
             * http://stackoverflow.com/questions/16377375/using-canvas-drawimage-in-chrome-extension-content-script/16378270
             */
            frame.img = document.createElement('img');
            frame.img.onload = function () {
                URL.revokeObjectURL(this.src);
                resolve();
            }
            frame.img.onerror = function () {
                reject(`第${index + 1}张帧图创建失败`);
            }
            frame.img.src = url;
        })
    })).then(() => {
        return apng;
    }, err => {
        throw new Error(err);
    });
};

/**
 * @param {Uint8Array} bytes
 * @param {function(string, Uint8Array, int, int)} callback
 */
function parseChunks (bytes, callback) {
    let off = 8;
    let res, type;
    do {
        const length = getUint32(bytes, off);
        type = readString(bytes, off + 4, 4);
        res = callback(type, bytes, off, length);
        off += 12 + length;
    } while (res !== false && type != "IEND" && off < bytes.length);
};

/**
 * @param {Uint8Array} bytes
 * @param {int} off
 * @return {int}
 */
function getUint32 (bytes, off) {
    let x = 0;
    // Force the most-significant byte to unsigned.
    x += ((bytes[0 + off] << 24 ) >>> 0);
    for (let i = 1; i < 4; i++) x += ( (bytes[i + off] << ((3 - i) * 8)) );
    return x;
};

/**
 * @param {Uint8Array} bytes
 * @param {int} off
 * @return {int}
 */
function getUint16 (bytes, off) {
    let x = 0;
    for (let i = 0; i < 2; i++) x += (bytes[i + off] << ((1 - i) * 8));
    return x;
};

/**
 * @param {Uint8Array} bytes
 * @param {int} off
 * @return {int}
 */
function getUint8 (bytes, off) {
    return bytes[off];
};

/**
 * @param {Uint8Array} bytes
 * @param {int} start
 * @param {int} length
 * @return {Uint8Array}
 */
function subBuffer (bytes, start, length) {
    const a = new Uint8Array(length);
    a.set(bytes.subarray(start, start + length));
    return a;
};

function readString (bytes, off, length) {
    const chars = Array.prototype.slice.call(bytes.subarray(off, off + length));
    return String.fromCharCode.apply(String, chars);
};

function makeDWordArray (x) {
    return [(x >>> 24) & 0xff, (x >>> 16) & 0xff, (x >>> 8) & 0xff, x & 0xff];
};
function makeStringArray (x) {
    const res = [];
    for (let i = 0; i < x.length; i++) res.push(x.charCodeAt(i));
    return res;
};
/**
 * @param {string} type
 * @param {Uint8Array} dataBytes
 * @return {Uint8Array}
 */
function makeChunkBytes (type, dataBytes) {
    const crcLen = type.length + dataBytes.length;
    const bytes = new Uint8Array(new ArrayBuffer(crcLen + 8));
    bytes.set(makeDWordArray(dataBytes.length), 0);
    bytes.set(makeStringArray(type), 4);
    bytes.set(dataBytes, 8);
    const crc = crc32(bytes, 4, crcLen);
    bytes.set(makeDWordArray(crc), crcLen + 4);
    return bytes;
};