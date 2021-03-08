# 基于react的apng动图组件, 将apng解析，通过canvas播放。

### install

```shell
npm install --save apng-react
```
### use

```javascript
import Apng from 'apng-react';
import image from './a.png';
function App() {
    return <Apng src={image} />
}
```

### props

| prop | description | type |
|----|------------|----|
src|图片资源地址|string、string[]
rate|播放速率（默认值为1，按动图资源的间隔播放，值越小速度越快，必须大于0）（与time互斥，优先级低于time）|number
time|规定完整播放一遍动画的时间（秒）（与rate互斥，优先级高与rate）|number
autoPlay|是否自动播放(只播一次)，默认false|boolean
autoPlayLoop|是否自动播放(循环播放)， 默认false|boolean
cache|是否缓存(到组件被卸载) TODO|boolean
cacheGlobal|是否缓存(直到窗口关闭) TODO|boolean

### event
事件|描述
----|----
ref|返回dom节点
onRefs|返回关联对象，用于调用内部方法
onLoad|图片资源加载完成回调
onLoopEnd|每次播放到最后一帧回调
onFirstLoopEnd|首次播放到最后一帧回调
onEnd|动画停止时回调

### function
#### 通过onRefs拿到的实例对象下的方法

方法|描述|参数
----|----|----
play|播放动画|index: number类型，播放次数。默认播放一次，0为循环播放
stop|停止播放|isSmooth: boolean类型，是否平滑停止,默认false。<br>- true: 当前资源渲染到最后一帧后再停止并停留在最后一帧，触发onEnd回调。<br> - false: 立即清除动画，触发onEnd回调
change|当src属性为array时，调用此方法可切换动图播放| (index：number, isSmooth: boolean)<br>index：值为src索引下标。<br>isSmooth：是否在当前资源渲染到最后一帧后再切换,默认false。<br>- true: 会自动调用play方法，播放的次数是调用play时传递的参数。如果不想自动调用play，请使用stop方法。<br>- false: 只渲染切换的动图的第一帧图
pause|暂停播放|-