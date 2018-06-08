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

const ACTIVE_LINE_OPTIONS = { width: 1, color: 'yellow'};
const INACTIVE_LINE_OPTIONS = {width: 1, color: 'green'};
const SELECTED_LINE_OPTIONS = {width: 1, color: 'red'};

class SvgControls {
  constructor(element, svgDOM) {
    _.extend(this, backbone.Events);
    this.element = element;
    this.paths = [];
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
    _.each(this.paths, (path) => {
      if (path.getAttribute("id") == ignoreId) return;

      let shape = path.svgIntersections;
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
        collisions.push({path, intersection, distance});
      }
    });
    return collisions;
  }

  getClosestCollision(path, direction){
    let x1,y1,x2,y2,ray;
    let bbox = path.getBBox();
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
    collisions = this.castRay(ray, path);

    let closest = _.sortBy(collisions, "distance")[0];
    return closest;
  }

  moveLocal(e){
    let keys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    if (!_.includes(keys, e.code)) return;
    let path = _.find(this.paths, "selected");
    let closest;
    if (e.code == "ArrowUp") closest = this.getClosestCollision(path, "T");
    if (e.code == "ArrowDown") closest = this.getClosestCollision(path, "B");
    if (e.code == "ArrowLeft") closest = this.getClosestCollision(path, "L");
    if (e.code == "ArrowRight") closest = this.getClosestCollision(path, "R");

    path.active = false;
    if (closest.distance > this.neighbourDistance) return;
    if (this.fluxelsInverted != true) {
      closest.path.selected = true;
      closest.path.active = true;
    } else {
      // If inverted turn on all but the one selected;
      this.paths.forEach((p)=>p.active = false);

      // Activate neighbours
      let dirs = ["L", "R", "T", "B", "TL", "TR", "BL", "BR"];
      let neighbours = _.map(dirs, d=>this.getClosestCollision(path, d));

      // Turn on neighbour paths
      _.each(neighbours, (neighbour) => {
        if (neighbour == undefined) return;
        neighbour.path.active = true;
      });
      path.active = true;
      closest.path.selected = true;
      closest.path.active = false;

      // Turn off all after given duration
      setTimeout(() => {
        let selected = _.find(this.paths, "selected");
        // if no longer selected, then dont turn off (timeout no longer relevent)
        if (selected.id != _.get(closest, "path.id")) return;
        this.paths.forEach((p)=>p.active = false);
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
    this.paths = svg.querySelectorAll("[data-channels]");

    let _this = this;

    let activeRoute = {line: null, ids: null};
    let drawingRoute = false;

    _.each(this.paths, (path) => {

      const d = path.getAttribute("d");
      path.svgIntersections = svgIntersections.shape("path", {d});

      let active, selected;

      if (path.active != undefined) {
        active = path.active;
        delete path.active;
      }

      Object.defineProperty(path, 'active', {
        configurable: true,
        get: function() {return this._active == true},
        set: function(_active) {
          this._active = _active;
          if (_active == true) this.style.fill = GREEN;
          if (_active != true) this.style.fill = BLUE;
          _this.trigger("fluxels-updated", {
            active: _.filter(_this.paths, "active"),
            selected: _.filter(_this.paths, "selected"),
            all: _this.paths
          });
        }
      });

      if (active != undefined) path.active = active;

      if (path.selected != undefined) {
        selected = path.selected;
        delete path.selected;
      }
      Object.defineProperty(path, 'selected', {
        configurable: true,
        get: function() {return this._selected == true},
        set: function(_selected) {
          // Unselect all other paths:
          _.each(_this.paths, (p) => {
            p._selected = false;
            p.style.stroke = "";
          });

          this._selected = _selected;
          if (_selected == true) this.style.stroke = RED;
        }
      });

      if (selected != undefined) path.selected = selected;

      path.onclick = (e) => {
        if (this.fluxelsInverted) {
          // Disable standard click for inverted mode (as doesn't make sense)
          this.paths.forEach((p)=>p.active = false);
          if (_this.shiftDown == true) path.selected = true;
          return;
        } else {
          let active = path.active;
          path.active = !path.active;
          if (_this.shiftDown == true) path.selected = true;
        }
      };

      path.onmousedown = (e) => {
        if (e.button != 0) return;
        drawingRoute = true;
        let ids = [path.id];
        let line = draw.polyline().fill('none').stroke(ACTIVE_LINE_OPTIONS);

        activeRoute.ids = [path.id];
        activeRoute.channels = [path.dataset.channels];
        activeRoute.line = line;

        let bbox = path.getBBox();
        let x = bbox.x + bbox.width/2;
        let y = bbox.y + bbox.height/2;

        line.plot([[x, y]]);
      };

      path.onmouseover = (e) => {
        if (drawingRoute != true) return;
        activeRoute.ids.push(path.id);
        activeRoute.channels.push(path.dataset.channels);
        let line = activeRoute.line;
        let prev = line.array();
        let bbox = path.getBBox();

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
          let paths = svg.querySelectorAll(`[data-channels="${channel}"]`);
          _.each(paths, (p) => p.active = true);
          await new Promise((res,rej)=>setTimeout(res, time));
          _.each(paths, (p) => p.active = false);
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
