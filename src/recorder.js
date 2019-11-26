import EventEmitter from './event-emitter';

const findSupportedMimeType = list =>
  MediaRecorder && 'isTypeSupported' in MediaRecorder
    ? list.find(mimeType => MediaRecorder.isTypeSupported(mimeType)) || ''
    : '';

class Recorder extends EventEmitter {
  constructor(stream, mimeType) {
    super();

    if (!mimeType) {
      mimeType = stream.getVideoTracks().length
        ? findSupportedMimeType([
            'video/webm;codecs="vp9,opus"',
            'video/webm;codecs="vp9.0,opus"',
            'video/webm;codecs="avc1"',
            'video/x-matroska;codecs="avc1"',
            'video/webm;codecs="vp8,opus"'
          ])
        : findSupportedMimeType(['audio/ogg;codecs=opus', 'audio/webm;codecs=opus']);
    }

    const _recData = [];
    this.recorder = new MediaRecorder(stream, { mimeType });
    this.recorder.ondataavailable = function(e) {
      if (e.data.size > 0) {
        _recData.push(e.data);
      }
    };

    this.recorder.onerror = error => {
      this.emit('record.error', error);
    };

    this.recorder.onstart = () => {
      this.emit('record.start', true);
    };

    this.result = null;

    this.recorder.onstop = () => {
      let mimeType = (this.deviceType === 'audio' ? 'audio' : 'video') + '/webm';
      this.result = new Blob(_recData, { type: mimeType });
      let url = URL.createObjectURL(this.result);
      this.emit('record.complete', { url: url, media: this.result });
      this.recorder = null;
    };

    Object.defineProperty(this, 'recData', {
      get: function() {
        return _recData;
      }
    });

    this.isRecording = false;
    this.isPaused = false;
  }

  start(delay) {
    delay = delay || 0;
    if (!this.isRecording) {
      setTimeout(() => {
        this.recorder.start();
      }, delay);
      this.isRecording = true;
    } else if (this.isPaused) {
      this.resume();
    }
  }

  pause() {
    if (!this.isPaused) {
      this.recorder.pause();
    } else {
      this.resume();
    }
    this.isPaused = !this.isPaused;
  }

  resume() {
    if (this.recorder.state === 'paused') {
      this.recorder.resume();
    }
  }

  stop() {
    this.recorder.stop();
    this.isRecording = false;
  }
}

export default Recorder;