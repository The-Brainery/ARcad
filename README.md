# ARcad
SVG Object + camera overlay (and vice versa) with Perpective Transform and DOM events


## Setup (no NPM/webpack)

1. Clone this repository

2. Move build/ARcad.web.js into your application path

3. Add script to header
```html
<html>
  <head>
    <script src="/ARcad.web.js"></script>
  </head>
  ...
```

4. See examples directory for more info

## Running Examples

### Basic example
Open ```examples/basic/index.html``` in your web browser

### Electron example
1. Navigate to ```examples/electron```
2. Run ```npm install``` or ```yarn install```
3. Start the sample application via ```npm run start``` or ```yarn start```

### Arduino + Electron example
1. Navigate to ```examples/arduino```
2. Upload ```examples/arduino/serialReader/serialReader.ino``` to your arduino
3. Run ```npm install``` or ```yarn install``` from ```examples/arduino```
4. Run ```npm run start``` or ```yarn start``` from ```examples/arduino```

## Development

1. run ```npm install``` or ```yarn install``` from root directory

2. If you want to use the bundled version, run the following:
  ```npm run build``` or ```yarn build``` from root directory


## SVG requirements, and how to fix common problems

1. Ensure your svg appears correctly when opened via a webbrowser (i.e right click -> open with Chrome etc.)

2. Ensure the svg contains a viewBox attribute ```<svg viewBox="0 0 67 67" ...>```html in the root node. If the viewBox attribute is not present, simply add it manually (```<svg viewBox="0 0 WIDTH HEIGHT" ...>```). Play with WIDTH and HEIGHT until it looks proper in the browser (if too large: the svg will appear padded on the right/bottom sides; if too small: the svg will be cropped)

3. Ensure that your fluxels have an attribute called "data-channels" and an "id" attribute. The id attribute must be unique for every fluxel! "data-channels" defines how the fluxels are connected, and is used as a selector. The id is used for restoring the state of the svg upon reload. 

## Help

### Debugging Glitchy SVG Files

1. Clean up the svg to have as little junk as possible from the text editor. Ideally the structure should be:
```svg
<svg>
  <g>
    <path data-channels="0" id="fluxel00" "d="...">
    <path data-channels="1" id="fluxel01" "d="...">
    ...
  </g>
</svg>
```

2. Send me the file, and I'll try my best to fix it for you (lucas@the-brainery.com)

### Additional Help

1. Send me an email (lucas@the-brainery.com or lucas.zeer@gmail.com) if you need additional install help, and/or to schedule a video chat on appear.in


## Acknowledgements

Inspired by **Christian Fobel's** DMF Device UI plugin, and three.planetransform.

See: https://github.com/sci-bots/three.planetransform
See: https://github.com/sci-bots/dmf-device-ui

The core library used was built by **Jenny Louthan** , with additional inspiration from the demos.
https://github.com/jlouthan/perspective-transform
