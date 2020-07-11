function Painter (canvas, source, _opts = {}) {
    const { width, height } = source[0];
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.source = source;
    const ratio = getPixelRatio(this.ctx);
    const opts = {
        w: width * ratio,
        h: height * ratio,
        rate: 1, // 播放速率（默认按图片默认间隔播放，值越小速度越快）（与time互斥，优先级低于time）
        time: null, // 完整播放一遍的时间（秒）（与rate互斥，优先级高与rate）
        ratio: ratio,
        onLoopEnd: () => {},
        onFirstLoopEnd: () => {},
        onEnd: () => {},
        ..._opts
    };
    this.opts = opts;
    this.isFirstLoopEnd = false;
    this.isPlay = false;
    this.smoother = {
        stopStatus: 1, // 平滑停止状态值
        changeStatus: 2, // 平滑切换状态值
        status: null // 平滑结束状态
    }; // 平滑结束

    this.currSourceIndex = 0;
    this.totalSource = source.length;
    this.canvas.width = opts.w;
    this.canvas.height = opts.h;
}
/**
 * 播放
 * @param {number} count 播放次数
 */
Painter.prototype.play = function (count = 1) {
    if (typeof count !== 'number') {
        throw new Error(`PARAM ERROR: param count="${count}" in function play is required type of number`);
    }
    const self = this;
    if (self.isPlay) return;
    self.isPlay = true;
    let loopCount = Math.floor(Math.abs(count));
    let playCount = 0;
    const { ratio, time, rate, w, h, onFirstLoopEnd, onLoopEnd, onEnd } = self.opts;
    let { frames, currFrame, length, width, height } = self.source[self.currSourceIndex];
    
    initCanvasSize(self, width, height, ratio);

    let performamceNow = 0;
    let delayTime = null;
    if (time) {
        delayTime = Math.round(time * 100000 / length) / 100; // 保留两位小数
    }
    const currSourceIndex = self.currSourceIndex;
    function drawImage(timestamp, isFirst = false) {
        const { img, left, top, width, height, delay } = frames[currFrame];
        if ((delayTime && timestamp - performamceNow >= delayTime) || (!delayTime && timestamp - performamceNow >= delay * rate) || isFirst) {
            performamceNow = timestamp;
            currFrame++;
            self.ctx.clearRect(0, 0, w, h);
            self.ctx.drawImage(img, left * ratio, top * ratio, width * ratio, height * ratio);
        }
        if (currFrame >= length) {
            currFrame = 0;
            // 非循环播放时，累计播放次数
            if (!loopCount) {
                playCount++
            }
            const { status, changeStatus, stopStatus } = self.smoother;
            // 已启动平滑结束
            if (status) {
                self.isPlay = false;
                // 资源切换，自动调用play
                status === changeStatus && Promise.resolve().then(() => {
                    self.play(count);
                });
                // 动画停止，调用onEnd
                status === stopStatus && typeof onEnd === 'function' && onEnd();
                self.smoother.status = null;
            } else {
                // 循环播放或者播放loopCount次
                if (loopCount === 0 || playCount < loopCount) {
                    self.raf = requestAnimationFrame(drawImage);
                } else {
                    self.isPlay = false;
                    // 播放结束，调用onEnd
                    typeof onEnd === 'function' && onEnd();
                }
            }
            // 首次完整播放完
            !self.isFirstLoopEnd && onFirstLoopEnd(currSourceIndex);
            self.isFirstLoopEnd = true;
            onLoopEnd(currSourceIndex);
        } else {
            self.raf = requestAnimationFrame(drawImage);
        }
        self.source[currSourceIndex].currFrame = currFrame;

    }
    self.raf = requestAnimationFrame(timestamp => {
        drawImage(timestamp, true);
    });
}
/**
 * 切换动图的资源
 * @param {number} index 要切换到的资源下标
 * @param {boolean} [isSmooth=false]
 * 是否平滑的切换(当前资源渲染到最后一帧后再切换)
 * true 则会自动调用play方法，播放的次数是调用play时传递的参数
 * false 需要手动调用play方法
 */
Painter.prototype.change = function (index, isSmooth = false) {
    if (typeof index !== 'number') {
        throw new Error('PARAM ERROR: index is required type of number');
    }
    const currSourceIndex = index >= this.totalSource ? this.currSourceIndex : index;
    if (isSmooth) {
        this.smoother.changeStatus = this.smoother.changeStatus;
    } else {
        // 清除play，并重新初始化当前各资源状态
        cancelAnimationFrame(this.raf);
        this.source[this.currSourceIndex].currFrame = 0;
        this.isPlay = false;
        this.smoother.status = null;
        const { w, h } = this.opts;
        this.ctx.clearRect(0, 0, w, h);

        // 渲染切换后动图资源的第一帧
        let { frames, currFrame, length, width: _wid, height: _hei } = this.source[currSourceIndex];
        initCanvasSize(this, _wid, _hei, ratio);
        const { img, left, top, width, height } = frames[currFrame];
        this.ctx.drawImage(img, left * ratio, top * ratio, width * ratio, height * ratio);
        this.source[currSourceIndex].currFrame = currFrame + 1 >= length ? 0 : currFrame + 1;
    }
    this.currSourceIndex = currSourceIndex;
}
/**
 * 
 * 停止
 * @param {boolean} [isSmooth=false] 是否平滑的停止
 * 为true则当前资源渲染到最后一帧后再停止，停留在最后一帧，触发onEnd回调
 * 为false则立即清除动画，触发onEnd回调
 */
Painter.prototype.stop = function(isSmooth = false) {
    if (isSmooth) {
        if (this.smoother.status) return; // 正在平滑结束阶段
        this.smoother.status = this.smoother.stopStatus;
        return;
    }
    cancelAnimationFrame(this.raf);
    const { w, h } = this.opts;
    this.ctx.clearRect(0, 0, w, h);
    this.source[this.currSourceIndex].currFrame = 0;
    this.isPlay = false;
    this.smoother.status = null;
    const { onEnd } = this.opts;
    typeof onEnd === 'function' && onEnd();
}
/**
 * 暂停
 */
Painter.prototype.pause = function() {
    cancelAnimationFrame(this.raf);
    this.isPlay = false;
}
// 初始化canvas尺寸
function initCanvasSize(_this, width, height, ratio) {
    const { w, h } = _this.opts;
    const _w = width * ratio;
    const _h = height * ratio;
    // 当前动图资源如果尺寸变化则重新设置width和height
    if (w !== _w || h !== _h) {
        _this.opts.w = _w;
        _this.opts.h = _h;
        _this.canvas.width = _w;
        _this.canvas.height = _h;
    }

}
// 获取设备dpi，解决canvas绘图模糊
function getPixelRatio(context) {
    const backingStore =
        context.backingStorePixelRatio ||
        context.webkitBackingStorePixelRatio ||
        context.mozBackingStorePixelRatio ||
        context.msBackingStorePixelRatio ||
        context.oBackingStorePixelRatio ||
        context.backingStorePixelRatio ||
        1;
    const ratio = (window.devicePixelRatio || 1) / backingStore;
    return ratio > 2 ? ratio : 2;
};

export default Painter;