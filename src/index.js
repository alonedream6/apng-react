import React from 'react';
import PropTypes from 'prop-types';
import creatorFrames from './utils/creator';
import Painter from './utils/painter';

const propTypes = {
    src: PropTypes.string | PropTypes.arrayOf(PropTypes.string), // 图片资源
    rate: PropTypes.number, // 播放速率（默认按图片默认间隔播放，值越小速度越快）（与time互斥，优先级低于time）
    time: PropTypes.number, // 完整播放一遍的时间（秒）（与rate互斥，优先级高与rate）
    autoPlay: PropTypes.bool, // 是否自动播放(只播一次)
    autoPlayLoop: PropTypes.bool, // 是否自动播放(循环播放)
    cache: PropTypes.bool, // 是否缓存(到组件被卸载) TODO
    cacheGlobal: PropTypes.bool, // 是否缓存(直到窗口关闭) TODO
    ref: PropTypes.func, // 返回dom节点
    onRefs: PropTypes.func, // 返回关联对象，用于调用内部方法
    onLoad: PropTypes.func, // 图片资源加载完成回调
    onEnd: PropTypes.func, // 动画结束时回调
    onLoopEnd: PropTypes.func, // 播放到最后一帧回调
    onFirstLoopEnd: PropTypes.func, // 首次播放到最后一帧回调
}
class Apng extends React.PureComponent {
    constructor(props) {
        super(props);
        this.canvasRef = null;
    }
    componentDidMount() {
        const {
            src,
            cache,
            rate,
            time,
            cacheGlobal,
            autoPlay,
            autoPlayLoop,
            ref,
            onLoad,
            onRefs,
            onFirstLoopEnd,
            onLoopEnd,
            onEnd,
        } = this.props;
        src && creatorFrames(src, cache || cacheGlobal).then(res => {
            const painter = new Painter(
                this.canvasRef,
                res,
                {
                    rate,
                    time,
                    onFirstLoopEnd,
                    onLoopEnd,
                    onEnd,
                }
            );
            onRefs && onRefs(painter);
            ref && ref(this.canvasRef);
            if (autoPlay || autoPlayLoop) {
                painter.play(autoPlayLoop ? 0 : undefined);
            }
            typeof onLoad === 'function' && onLoad();
        });
    }
    componentWillUnmount() {
        const { cacheGlobal } = this.props;
        this.stop();
        if (!cacheGlobal) {
            // TODO
        }
    }
    render() {
        const { src } = this.props;
        return src ? <div className="apng-react">
            <canvas ref={elem => this.canvasRef = elem} />
        </div> : null;
    }
}
Apng.propTypes = propTypes;
Apng.defaultProps = {
    rate: 1,
    time: null,
    autoPlay: false,
    autoPlayLoop: false,
    cache: false,
    onLoopEnd: () => {},
    onFirstLoopEnd: () => {},
    onEnd: () => {},
}
export default Apng;