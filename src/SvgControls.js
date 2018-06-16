const yo = require('yo-yo');
const _ = require('lodash');
const svgIntersections = require('svg-intersections');
const basicContext = require('basiccontext');
const backbone = require('backbone');
const SVG = require('svg.js');

// Make some of these constants accessible through mqtt
const GREEN = "rgb(0,255,0)";
const BLUE = "rgb(0,0,255)";
const RED = "rgb(255,0,0)";
const DISTANCE = 10000;
const NUM_SEGS = 10;

const Ray = (x1,y1,x2,y2) => {
  return svgIntersections.shape("line", { x1, y1, x2, y2 });
}

const ACTIVE_LINE_OPTIONS = { width: 15, color: 'yellow'};
const INACTIVE_LINE_OPTIONS = {width: 15, color: 'green'};
const SELECTED_LINE_OPTIONS = {width: 15, color: 'red'};

class SvgControls {
  constructor(element, svgDOM) {
    _.extend(this, backbone.Events);
    this.element = element;
    this.fluxels = [];
    this.init(element, svgDOM);
  }

  executeAll() {
    let routes = this.element.querySelectorAll(".route");
    _.each(routes, (r) => r.execute());
  }

  removeAll() {
    let routes = this.element.querySelectorAll(".route");
    _.each(routes, (r) => r.remove());
  }

  addListeners() {
    document.addEventListener("keydown", (e) => {
      if (e.key == "Shift") this.shiftDown = true;
    });

    document.addEventListener("keyup", (e) => {
      if (e.key == "Shift") this.shiftDown = false;
    });

  }

  castRay(ray, ignore) {
    let ignoreId = ignore.getAttribute("id");
    let start = ray.params[0];
    let collisions = [];
    _.each(this.fluxels, (fluxel) => {
      if (fluxel.getAttribute("id") == ignoreId) return;

      let shape = fluxel.svgIntersections;
      var intersection = svgIntersections.intersect(ray,shape);
      if (intersection.points.length > 0) {
        let distances = [];
        _.each(intersection.points, (point) => {
          let dx = point.x - start.x;
          let dy = point.y - start.y;
          let distance = Math.sqrt(dx*dx + dy*dy);
          distances.push(distance);
        });
        let distance = _.min(distances);
        collisions.push({fluxel, intersection, distance});
      }
    });
    return collisions;
  }

  getClosestCollision(fluxel, direction){
    let x1,y1,x2,y2,ray;
    let bbox = fluxel.getBBox();
    let collisions = [];

    if (_.includes(direction, "T")) {
      y1 = bbox.y;
      if (_.includes(direction, "R")) {
        x1 = bbox.x + bbox.width;
        x2 = x1 + DISTANCE*Math.cos(Math.PI/4);
        y2 = y1 - DISTANCE*Math.sin(Math.PI/4);
      } else if (_.includes(direction, "L")) {
        x1 = bbox.x;
        x2 = x1 - DISTANCE*Math.cos(Math.PI/4);
        y2 = y1 - DISTANCE*Math.sin(Math.PI/4);
      } else {
        x1 = x2 = bbox.x + bbox.width/2;
        y2 = y1 - DISTANCE;
      }
    }

    else if (_.includes(direction, "B")) {
      y1 = bbox.y + bbox.height;
      if (_.includes(direction, "R")) {
        x1 = bbox.x + bbox.width;
        x2 = x1 + DISTANCE*Math.cos(Math.PI/4);
        y2 = y1 + DISTANCE*Math.sin(Math.PI/4);
      } else if (_.includes(direction, "L")) {
        x1 = bbox.x;
        x2 = x1 - DISTANCE*Math.cos(Math.PI/4);
        y2 = y1 + DISTANCE*Math.sin(Math.PI/4);
      } else {
        x1 = x2 = bbox.x + bbox.width/2;
        y2 = y1 + DISTANCE;
      }
    }

    else if (direction == "R") {
      x1 = bbox.x + bbox.width;
      x2 = x1 + DISTANCE;
      y1 = y2 = bbox.y + bbox.height/2;
    }

    else if (direction == "L") {
      x1 = bbox.x;
      x2 = x1 - DISTANCE;
      y1 = y2 = bbox.y + bbox.height/2;
    }

    ray = Ray(x1,y1,x2,y2);
    collisions = this.castRay(ray, fluxel);

    let closest = _.sortBy(collisions, "distance")[0];
    return closest;
  }

  moveLocal(e){
    let keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (!_.includes(keys, e.code)) return;
    let fluxel = _.find(this.fluxels, "selected");
    let closest;
    if (e.code == "ArrowUp") closest = this.getClosestCollision(fluxel, "T");
    if (e.code == "ArrowDown") closest = this.getClosestCollision(fluxel, "B");
    if (e.code == "ArrowLeft") closest = this.getClosestCollision(fluxel, "L");
    if (e.code == "ArrowRight") closest = this.getClosestCollision(fluxel, "R");

    fluxel.active = false;
    if (closest.distance > this.neighbourDistance) return;
    if (this.fluxelsInverted != true) {
      closest.fluxel.selected = true;
      closest.fluxel.active = true;
    } else {
      // If inverted turn on all but the one selected;
      this.fluxels.forEach((p)=>p.active = false);

      // Activate neighbours
      let dirs = ["L", "R", "T", "B", "TL", "TR", "BL", "BR"];
      let neighbours = _.map(dirs, d=>this.getClosestCollision(fluxel, d));

      // Turn on neighbour fluxels
      _.each(neighbours, (neighbour) => {
        if (neighbour == undefined) return;
        if (neighbour.distance > this.neighbourDistance) return;
        neighbour.fluxel.active = true;
      });
      fluxel.active = true;
      closest.fluxel.selected = true;
      closest.fluxel.active = false;

      // Turn off all after given duration
      setTimeout(() => {
        let selected = _.find(this.fluxels, "selected");
        // if no longer selected, then dont turn off (timeout no longer relevent)
        if (selected.id != _.get(closest, "fluxel.id")) return;
        this.fluxels.forEach((p)=>p.active = false);
      }, this.invertDuration);
    }

  }

  loadSvg(url) {
    // TODO: Make the default svg accessible through mqtt
    let xhr = new XMLHttpRequest();
    xhr.open("GET",url,false);
    xhr.overrideMimeType("image/svg+xml");
    xhr.send("");

    let documentElement = xhr.responseXML.documentElement;
    return documentElement;
  }

  init(element, svgDOM) {

    let svg = svgDOM;
    //this.loadSvg(svgUrl);

    this.addListeners();

    let draw = SVG.adopt(svg);

    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.opacity = "1.0";
    // Todo: Automatically figure out viewBox
    this.fluxels = svg.querySelectorAll("[data-channels]");

    let _this = this;

    let activeRoute = {line: null, ids: null};
    let drawingRoute = false;

    _.each(this.fluxels, (fluxel) => {

      switch (fluxel.tagName) {
        case "path":
          const d = fluxel.getAttribute("d");
          fluxel.svgIntersections = svgIntersections.shape("path", {d});
          break;
        case "polygon":
          const pointAttr = fluxel.points;
          const points = _.map(pointAttr, (p) => `${p.x},${p.y}`).join(" ");
          fluxel.svgIntersections = svgIntersections.shape("polygon", {points});
          break;
        case "circle":
          const cx = fluxel.getAttribute("cx");
          const cy = fluxel.getAttribute("cy");
          const r = fluxel.getAttribute("r");
          fluxel.svgIntersections = svgIntersections.shape("circle", {cx, cy, r});
          break;
      }

      let active, selected;

      if (fluxel.active != undefined) {
        active = fluxel.active;
        delete fluxel.active;
      }

      Object.defineProperty(fluxel, 'active', {
        configurable: true,
        get: function() {return this._active == true},
        set: function(_active) {
          this._active = _active;
          if (_active == true) this.style.fill = GREEN;
          if (_active != true) this.style.fill = "";
          _this.trigger("fluxels-updated", {
            active: _.filter(_this.fluxels, "active"),
            selected: _.filter(_this.fluxels, "selected"),
            all: _this.fluxels
          });
        }
      });

      if (active != undefined) fluxel.active = active;

      if (fluxel.selected != undefined) {
        selected = fluxel.selected;
        delete fluxel.selected;
      }
      Object.defineProperty(fluxel, 'selected', {
        configurable: true,
        get: function() {return this._selected == true},
        set: function(_selected) {
          // Unselect all other fluxels:
          _.each(_this.fluxels, (p) => {
            p._selected = false;
            p.style.stroke = "";
            this.style.strokeWidth = 15;
          });

          this._selected = _selected;
          if (_selected == true) {
            this.style.stroke = RED;
            this.style.strokeWidth = 15;
          }
        }
      });

      if (selected != undefined) fluxel.selected = selected;

      fluxel.onclick = (e) => {
        if (this.fluxelsInverted) {
          if (_this.shiftDown == true) {
            this.fluxels.forEach((p)=>p.active = false);
            fluxel.selected = true;
          } else {
            fluxel.active = !fluxel.active;
          }
          return;
        } else {
          let active = fluxel.active;
          fluxel.active = !fluxel.active;
          if (_this.shiftDown == true) fluxel.selected = true;
        }
      };

      fluxel.onmousedown = (e) => {
        if (e.button != 0) return;
        drawingRoute = true;
        let ids = [fluxel.id];
        let line = draw.polyline().fill('none').stroke(ACTIVE_LINE_OPTIONS);

        activeRoute.ids = [fluxel.id];
        activeRoute.channels = [fluxel.dataset.channels];
        activeRoute.line = line;

        let bbox = fluxel.getBBox();
        let x = bbox.x + bbox.width/2;
        let y = bbox.y + bbox.height/2;

        line.plot([[x, y]]);
      };

      fluxel.onmouseover = (e) => {
        if (drawingRoute != true) return;
        activeRoute.ids.push(fluxel.id);
        activeRoute.channels.push(fluxel.dataset.channels);
        let line = activeRoute.line;
        let prev = line.array();
        let bbox = fluxel.getBBox();

        let x = bbox.x + bbox.width/2;
        let y = bbox.y + bbox.height/2;

        line.plot([...prev.value, [x, y]]);
      };
    });

    document.addEventListener("mouseup", (e) => {
      if (drawingRoute != true) return;
      drawingRoute = false;
      const line = activeRoute.line;
      line.stroke(INACTIVE_LINE_OPTIONS);
      line.ids = activeRoute.ids;
      line.channels = activeRoute.channels;
      line.node.setAttribute("class", "route");
      line.node.execute = async () => {
        let time = parseInt(localStorage.getItem("transition")) || 1000;
        this.trigger("route-executed", {
          routeExecuted: line.node,
          routes: document.querySelectorAll(".route"),
          transition: time
        });
        for (let [i, channel] of line.channels.entries()) {
          let fluxels = svg.querySelectorAll(`[data-channels="${channel}"]`);
          _.each(fluxels, (p) => p.active = true);
          await new Promise((res,rej)=>setTimeout(res, time));
          _.each(fluxels, (p) => p.active = false);
        }
      };

      line.node.clear = () => {
        this.trigger("route-removed", {
          removedRoute: _.clone(line.node),
          routes: document.querySelectorAll(".route")
        });
        line.node.remove();
      }

      line.node.addEventListener("contextmenu", (e) => {
        line.stroke(SELECTED_LINE_OPTIONS);

        // Unselect on "click" action
        let unselectFcn;
        unselectFcn = (e) => {
          line.stroke(INACTIVE_LINE_OPTIONS);
          document.removeEventListener("click", unselectFcn);
        }
        document.addEventListener("click", unselectFcn);

        let clicked = _.noop;
        let items = [
          {title: 'Remove Route', fn: ()=>line.node.clear()},
          {title: 'Execute Route', fn: async () => await line.node.execute()}
        ];
        basicContext.show(items, e);
      });

      this.trigger("route-added", {
        new: line.node,
        all: document.querySelectorAll(".route")
      });

    });

    element.innerHTML = '';
    element.appendChild(svg);
  }
}

module.exports = SvgControls;
