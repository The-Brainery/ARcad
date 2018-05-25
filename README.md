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
1. Ensure electron is installed globally and on the path ```npm i --global electron```
2. Navigate to ```examples/electron```
3. Run ```npm install``` or ```yarn install```
4. Start the sample application via ```electron .```

## Development

1. run ```npm install``` or ```yarn install``` from root directory

2. If you want to use the bundled version, run the following:
  ```npm run build``` or ```yarn build``` from root directory
