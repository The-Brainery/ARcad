require('basiccontext/dist/basicContext.min.css');
require('basiccontext/dist/themes/default.min.css');

const PerspT = require('perspective-transform');
const dat = require('dat.gui');
const yo = require('yo-yo');
const _ = require('lodash');
const backbone = require('backbone');

const SvgControls = require('./SvgControls.js');
const VideoCameraSelector = require('./VideoCameraSelector.js')();

class ARcad {
  constructor(element, svgDOM) {
    _.extend(this, backbone.Events);
    this.element = element;
    this.corners = [100, 100, 300, 100, 100, 300, 300, 300];
    this.currentcorner = -1;
    this.shiftDown = false;
    this.prevAnchors = [];
    this.scale = 1;
    this.svgControls = CreateScene(this, svgDOM);
    this.gui = CreateGUI(this, svgDOM);
    this.element.appendChild(this.gui.domElement);
    this.listen();
  }
  listen() {
    this.element.addEventListener("wheel", (e) => {
      e.preventDefault();
      e.stopPropagation();

      let container = this.element.querySelector("#container");
      let transform = container.style.transform;
      let scale = parseFloat(transform.split("scale(")[1].split(")")[0]);

      if (e.deltaY > 0) this.scale = scale - 0.01;
      if (e.deltaY < 0) this.scale = scale + 0.01;

      container.style.transform = `scale(${this.scale})`;
    });

    document.addEventListener("keyup", (e) => {
      if (document.activeElement != this.element) return;

      // TODO: Disable when container out of focus
      this.svgControls.moveLocal(e);
    });

    setTimeout(()=>{
      this.element.setAttribute("tabindex", 0);
      this.element.style.outlineColor = "transparent";
      this.element.style.outlineStyle = "none";

      this.element.focus();
      this.initTransform();
      this.element.addEventListener("mousedown", this.mousedown.bind(this));
      this.element.addEventListener("mouseup", this.mouseup.bind(this));
      this.element.addEventListener("mousemove", this.move.bind(this));

      const green = "rgba(32, 212, 66, 0.5)";
      const white = "rgba(255, 255, 255, 0.5)";

      document.addEventListener("keydown", (e) => {
        let markers = this.element.querySelectorAll(".corner");
        if (e.key != "Shift") return;
        this.shiftDown = true;
        _.each(markers, (m) => m.style.background = green);
      });

      document.addEventListener("keyup", (e) => {
        let markers = this.element.querySelectorAll(".corner");
        if (e.key != "Shift") return;
        this.shiftDown = false;
        _.each(markers, (m) => m.style.background = white);
      });
    }, 1000);

  }

  applyFlipRotateTransforms(elem="video") {
    let node;
    if (elem == "video") node = this.element.querySelector("video");
    let style = node.style;

    let rotate = localStorage.getItem("video-rotation") || 0;
    let scaleX = localStorage.getItem("video-scaleX") || 1;
    let scaleY = localStorage.getItem("video-scaleY") || 1;

    style.transform = `
      rotate(${rotate}deg) scaleX(${scaleX}) scaleY(${scaleY})`;
  }

  rotate(elem="video") {
    let rotate = parseInt(localStorage.getItem("video-rotation")) || 0;
    rotate += 90;
    if (rotate >= 450) rotate = 0;
    localStorage.setItem("video-rotation", rotate);
    this.applyFlipRotateTransforms(elem);
  }

  update() {
    let markers = this.element.querySelectorAll(".corner");
    for (var i = 0; i != 8; i += 2) {
      var marker = document.getElementById(`marker${i}`);
      marker.style.left = this.corners[i] + "px";
      marker.style.top = this.corners[i + 1] + "px";
    }

    if (this.shiftDown) {
      let i = this.currentcorner;
      let inverse = this.prevTransform.transformInverse(this.corners[i], this.corners[i+1]);
      this.prevAnchors[i] = inverse[0];
      this.prevAnchors[i+1] = inverse[1];
      localStorage.setItem("prevAnchors", JSON.stringify(this.prevAnchors));
    } else {
      this.transform2d(...this.corners);
    }
  }

  mousedown(e) {
    let cornerElem = this.element.querySelectorAll(".corner");
    if (_.get(cornerElem, "[0].style.display") == "none") return;

    let container = this.element.querySelector("#container-outer");
    let bbox = container.getBoundingClientRect();
    let corners = getScaledCoordinates(this.corners, bbox, this.scale);

    let x, y, dx, dy;
    let best = 1000;

    x = e.pageX - bbox.left;
    y = e.pageY - bbox.top;

    this.currentcorner = -1;

    for (var i = 0; i != 8; i += 2) {
      dx = x - corners[i];
      dy = y - corners[i + 1];
      if (best > dx*dx + dy*dy) {
        best = dx*dx + dy*dy;
        this.currentcorner = i;
      }
    }
    this.move(e);
  }

  mouseup(e) {
    this.currentcorner = -1;
  }

  move(e) {
    let x, y;
    let container = this.element.querySelector("#container-outer");
    let bbox = container.getBoundingClientRect();
    x = e.pageX - bbox.left;
    y = e.pageY - bbox.top;

    if (this.currentcorner < 0) return;

    let coords = getOriginalCoordinates(x, y, bbox, this.scale);

    this.corners[this.currentcorner] = coords.x;
    this.corners[this.currentcorner + 1] = coords.y;
    localStorage.setItem("corners", JSON.stringify(this.corners));

    this.update();
  }

  transform2d(...points) {
    let box = this.element.querySelector("#box");
    let w = parseFloat(box.style.width), h = parseFloat(box.style.height);
    let transform, t;

    if (this.prevAnchors.length <= 0)
      transform = PerspT([0,0,w,0,0,h,w,h], points);
    if (this.prevAnchors.length > 0)
      transform = PerspT(this.prevAnchors, points);

    t = transform.coeffs;
    t = [t[0], t[3], 0, t[6],
         t[1], t[4], 0, t[7],
         0   , 0   , 1, 0   ,
         t[2], t[5], 0, t[8]];

    this.prevTransform = transform;
    localStorage.setItem("prevTransform", JSON.stringify(this.prevTransform))

    t = "matrix3d(" + t.join(", ") + ")";
    box.style["-webkit-transform"] = t;
    box.style["-moz-transform"] = t;
    box.style["-o-transform"] = t;
    box.style.transform = t;
  }

  initTransform() {
    if (localStorage.getItem("prevAnchors") != null) {
      this.prevAnchors = JSON.parse(localStorage.getItem("prevAnchors"));
    }
    if (localStorage.getItem("corners") != null) {
      this.corners = JSON.parse(localStorage.getItem("corners"));
    }

    let markers = this.element.querySelectorAll(".corner");
    let corners = this.corners;
    this.transform2d(...this.corners);
    for (var i = 0; i != 8; i += 2) {
      var marker = _.find(markers, {id: `marker${i}`});
      marker.style.left = corners[i] + "px";
      marker.style.top  = corners[i + 1] + "px";
    }

    for (var i=0;i != 8; i += 2) {
      let inverse = this.prevTransform.transformInverse(corners[i], corners[i+1]);
      this.prevAnchors[i] = inverse[0];
      this.prevAnchors[i+1] = inverse[1];
    }

    localStorage.setItem("prevAnchors", JSON.stringify(this.prevAnchors));

  }
}

const getScaledCoordinates = (origCorners, bbox, scale) => {
  const corners = [];

  for (var i = 0; i != 8; i += 2) {
    const x_tl = origCorners[i];
    const y_tl = origCorners[i+1];
    const x_c = bbox.width/2 - x_tl;
    const y_c = bbox.height/2 - y_tl;

    const x_c_scaled = x_c * scale;
    const y_c_scaled = y_c * scale;


    const x_tl_scaled = bbox.width/2 - x_c_scaled;
    const y_tl_scaled = bbox.height/2 - y_c_scaled;
    corners[i] = x_tl_scaled;
    corners[i+1] = y_tl_scaled;
  }

  return corners;
}

const getOriginalCoordinates = (x, y, bbox, scale) => {

  const x_tl_scaled = x;
  const y_tl_scaled = y;

  const x_c_scaled = bbox.width/2 - x_tl_scaled;
  const y_c_scaled = bbox.height/2 - y_tl_scaled;

  const x_c = x_c_scaled/scale;
  const y_c = y_c_scaled/scale;

  const x_tl = bbox.width/2 - x_c;
  const y_tl = bbox.height/2 - y_c;

  return {x: x_tl, y: y_tl};
}

const CreateGUI = (arcad, svgDOM) => {
  let gui;

  var menu = {
    executeAll() {
      arcad.svgControls.executeAll();
    },
    removeAll() {
      arcad.svgControls.removeAll();
    },
    get transition() {
      return parseInt(localStorage.getItem("transition")) || 1000;
    },
    set transition(_time) {
      localStorage.setItem("transition", _time);
    },
    get hideAnchors() {
      let defaultVal = JSON.parse(localStorage.getItem("hide-anchors") || "false");
      let currentVal = this._hideAnchors;
      if (currentVal == undefined) this.hideAnchors = defaultVal;
      return this._hideAnchors;
    },
    set hideAnchors(_hideAnchors) {
      let corners = arcad.element.querySelectorAll(".corner");
      if (_hideAnchors == false) _.each(corners, (c) => c.style.display = "block")
      if (_hideAnchors == true) _.each(corners, (c) => c.style.display = "none")
      this._hideAnchors = _hideAnchors;
      localStorage.setItem("hide-anchors", _hideAnchors);
    },
    get flipForeground() {
      let placement = localStorage.getItem("placement");
      return placement == "bottom";
    },
    set flipForeground(_flipForeground) {
      if (_flipForeground == true) {
        localStorage.setItem("placement", "bottom");
        arcad.svgControls = CreateScene(arcad, svgDOM);
        arcad.initTransform();
        arcad.element.appendChild(gui.domElement);
      }
      if (_flipForeground == false) {
        localStorage.setItem("placement", "top");
        arcad.svgControls = CreateScene(arcad, svgDOM);
        arcad.initTransform();
        arcad.element.appendChild(gui.domElement);
      }
      VideoCameraSelector.setCamera(localStorage.getItem("video-camera") || -1);
      this._flipForeground = _flipForeground;
    },
    rotateVideo () {
      arcad.rotate("video");
    },
    get flipVideoX() {
      let x =  localStorage.getItem("video-scaleX");
      return x == -1;
    },
    set flipVideoX(_flipX) {
      if (_flipX == true) {
        localStorage.setItem("video-scaleX", -1);
      } else {
        localStorage.setItem("video-scaleX", 1);
      }
      arcad.applyFlipRotateTransforms("video");
    },
    get flipVideoY() {
      let y =  localStorage.getItem("video-scaleY");
      return y == -1;
    },
    set flipVideoY(_flipY) {
      if (_flipY == true) {
        localStorage.setItem("video-scaleY", -1);
      } else {
        localStorage.setItem("video-scaleY", 1);
      }
      arcad.applyFlipRotateTransforms("video");
    },
    get svgOpacity() {
      let svg = arcad.element.querySelector("svg");
      return svg.style.opacity * 100;
    },
    set svgOpacity(_svgOpacity) {
      let svg = arcad.element.querySelector("svg");
      svg.style.opacity = _svgOpacity / 100.0;
    },
    get neighbourDistance() {
      let defaultVal = JSON.parse(localStorage.getItem("neighbour-distance") || "10");
      let currentVal = _.get(arcad, "svgControls.neighbourDistance") || defaultVal;
      _.set(arcad, "svgControls.neighbourDistance", currentVal);
      localStorage.setItem("neighbour-distance", currentVal);
      return currentVal;
    },
    set neighbourDistance(_neighbourDistance) {
      _.set(arcad, "svgControls.neighbourDistance", _neighbourDistance);
      localStorage.setItem("neighbour-distance", _neighbourDistance);
    },
    get fluxelsInverted() {
      let defaultVal = JSON.parse(localStorage.getItem("fluxels-inverted") || "false");
      let currentVal = _.get(arcad, "svgControls.fluxelsInverted") || defaultVal;
      _.set(arcad, "svgControls.fluxelsInverted", currentVal);
      localStorage.setItem("fluxels-inverted", currentVal);
      return currentVal;
    },
    set fluxelsInverted(_fluxelsInverted){
      _.set(arcad, "svgControls.fluxelsInverted", _fluxelsInverted);
      localStorage.setItem("fluxels-inverted", _fluxelsInverted);
    },
    get invertDuration() {
      let defaultVal = JSON.parse(localStorage.getItem("invert-duration") || "1000");
      let currentVal = _.get(arcad, "svgControls.invertDuration") || defaultVal;
      _.set(arcad, "svgControls.invertDuration", currentVal);
      localStorage.setItem("invert-duration", currentVal);
      return currentVal;
    },
    set invertDuration(_duration) {
      _.set(arcad, "svgControls.invertDuration", _duration);
      localStorage.setItem("invert-duration", _duration);
    },
    get camera() {
      let defaultVal = localStorage.getItem("video-camera") || "-1";
      let currentVal = this._camera || defaultVal;
      if (this._camera == undefined)
        VideoCameraSelector.setCamera(currentVal);
      this._camera = currentVal;
      localStorage.setItem("video-camera", currentVal);
      return currentVal;
    },
    set camera(_camera) {
      this._camera = _camera;
      VideoCameraSelector.setCamera(_camera);
      localStorage.setItem("video-camera", _camera);
    },
    get strokeWidth() {
      let _strokeWidth;
      if (this._strokeWidth == undefined) {
        _strokeWidth = parseInt(localStorage.getItem("stroke-width")) || _.get(arcad, "svgControls.strokeWidth");
        this._strokeWidth = _strokeWidth;
        _.set(arcad, "svgControls.strokeWidth", _strokeWidth);
      }
      return this._strokeWidth;
    },
    set strokeWidth(_strokeWidth) {
      _.set(arcad, "svgControls.strokeWidth", _strokeWidth);
      localStorage.setItem("stroke-width", _strokeWidth);
      this._strokeWidth = _strokeWidth;
    }
  };

  gui = new dat.GUI({autoPlace: false});
  gui.sceneFolder = gui.addFolder('Scene');
  gui.routeFolder = gui.addFolder('Routes');
  gui.videoFolder = gui.addFolder('Video');
  gui.svgFolder = gui.addFolder('SVG');
  gui.customFolder = gui.addFolder('Custom');
  gui.sceneFolder.add(menu, 'flipForeground');
  gui.sceneFolder.add(menu, 'hideAnchors');
  gui.routeFolder.add(menu, 'removeAll');
  gui.routeFolder.add(menu, 'executeAll');
  gui.routeFolder.add(menu, 'transition', 0, 3000);
  gui.videoFolder.add(menu, 'rotateVideo');
  gui.videoFolder.add(menu, 'flipVideoX');
  gui.videoFolder.add(menu, 'flipVideoY');

  VideoCameraSelector.getVideoOptions().then((options) => {
    gui.videoFolder.add(menu, 'camera', options);
  });

  gui.svgFolder.add(menu, 'svgOpacity', 0, 100);
  gui.svgFolder.add(menu, 'neighbourDistance', 10);
  gui.svgFolder.add(menu, 'fluxelsInverted', false);
  gui.svgFolder.add(menu, 'invertDuration', 1000);
  gui.svgFolder.add(menu, 'strokeWidth', 0, 40);

  gui.domElement.style.position = "absolute";
  gui.domElement.style.top = "0px";
  gui.domElement.style.display = "inline-table";
  gui.menu = menu;
  return gui;
}

const CreateScene = (arcad, svgDOM) => {
  let background, foreground, deviceContainer, video;

  let placement = localStorage.getItem("placement") || "top";

  if (placement == 'top') {
    background = deviceContainer = yo`
    <div style="opacity: 0.5;z-index:10;${Styles.background}">
    </div> `;

    foreground = video = yo`
      <video id="video" style="${Styles.video};z-index:5;position:relative;
        width:100%;height:100%;" autoplay>
      </video>
    `;
  } else {
    background = video = yo`
      <video id="video" style="${Styles.background};${Styles.video}" autoplay></video>
    `;

    foreground = deviceContainer = yo`
      <div style="opacity: 0.5;"></div>
    `;
  }


  let container = yo`
    <div id="container-outer" style="${Styles.container}">
      <div id="container" style="${Styles.container}">
          ${background}
          <div id="box" style="${Styles.box}">
            ${foreground}
          </div>
          <div id="marker0" style="${Styles.corner}"class="corner">TL</div>
          <div id="marker2" style="${Styles.corner}"class="corner">TR</div>
          <div id="marker4" style="${Styles.corner}"class="corner">BL</div>
          <div id="marker6" style="${Styles.corner}"class="corner">BR</div>
      </div>
    </div>
  `;

  arcad.element.innerHTML = '';
  arcad.element.appendChild(container);
  arcad.applyFlipRotateTransforms("video");

  arcad.scale = 1;
  VideoCameraSelector.elem = video;

  // if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  //   navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
  //       VideoCameraSelector.stream = stream;
  //       VideoCameraSelector.elem = video;
  //       video.src = window.URL.createObjectURL(stream);
  //       video.play();
  //   });
  // }

  let controls = new SvgControls(deviceContainer, svgDOM);

  controls.on("all", (name, e) => {
    arcad.trigger(name, e);
  })

  return controls;
}

const Styles = {
  video: `
    object-fit: fill;
    transform: rotate(0deg);
  `,
  container: `
    position:relative;
    width: 500px;
    height: 500px;
    overflow: visible;
    user-select: none;
    margin: 0 auto;
    transform: scale(1);
  `,
  box: `
    position: absolute;
    top: 0px;
    left: 0px;
    width: 150px;
    height: 120px;
    transform-origin: 0 0;
    -webkit-transform-origin: 0 0;
    -moz-transform-origin: 0 0;
    -o-transform-origin: 0 0;
    user-select: none;
  `,
  boxImg: `
    width: 150px;
    height: 120px;
    user-select: none;
  `,
  corner: `
    position: absolute;
    top: 0px; left: 0px;
    border: 1px solid blue;
    border-radius: 20px;
    padding: 10px;
    background: rgba(255,255,255,0.5);
    user-select: none;
    z-index: 20;
    cursor: move;
  `,
  background: `
    position:relative;
    height:500px;
    width:500px;
    transform: scale(1);
  `
};

module.exports = ARcad;
