const _ = require('lodash');
let URL = (window.URL || window.webkitURL || window.mozURL || window.msURL);
let stream;

class VideoCameraSelector {
  constructor() {

  }

  async getVideoDevices() {
    let mediaDevices = await navigator.mediaDevices.enumerateDevices();
    return _.filter(mediaDevices, {kind: 'videoinput'});
  }

  async getVideoOptions() {
    let videoDevices = await this.getVideoDevices();
    let keys = _.map(videoDevices, (v, i) => {return i + ' ' + v.label });
    let cameraOptions = _.zipObject(keys, _.map(videoDevices, 'deviceId'));
    let defaultCameraOptions = {
      'Choose Camera': -1,
      'No Camera': -2
    };
    return _.extend(defaultCameraOptions, cameraOptions);
  }

  set elem(_elem) {
    this._elem = _elem;
  }

  get elem() {
    return this._elem;
  }

  async setCamera(deviceId) {
    console.log("Setting Camera!");

    let videoDevices = await this.getVideoDevices();
    let elem = this.elem;
    let _this = this;

    if (deviceId == -2) {
      _.each(videoDevices, (info) => {
        var constraints = {
          video: {deviceId: {exact: info.deviceId}}
        };
        navigator.mediaDevices.getUserMedia(constraints)
          .then(function(_stream) {
            console.log({_stream});
            stream = stream || _stream;
            stream.getTracks().forEach(track => {
              track.stop();
            });
            _stream.getTracks().forEach(track => {
              track.stop();
            });
        });
      });
      return;
    }

    navigator.mediaDevices.enumerateDevices().then((mediaDevices) => {
      mediaDevices = _.filter(mediaDevices, {kind: 'videoinput'});

      const info = _.filter(mediaDevices, {deviceId: deviceId})[0];
      var constraints = {
        video: {deviceId: info.deviceId ? {exact: info.deviceId} : undefined}
      };
      navigator.mediaDevices.getUserMedia(constraints)
        .then(function(_stream) {
          if (stream) stream.getTracks().forEach(t => t.stop() );
          stream = _stream;
          elem.src = URL.createObjectURL(stream);
          elem.play();
        });
    });

  }
};

module.exports = () => new VideoCameraSelector();
