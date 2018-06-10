const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path')
const url = require('url')

const _ = require('lodash');
const five = require('johnny-five');
let board;



const FLUXELS = [2,3,4,5,6,9,10];
const LOW = 0;
const HIGH = 1;


function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600})

  ipcMain.on('start-board', () => {
    board = new five.Board();
    board.on("ready", function() {
      _.each(FLUXELS, fluxel => this.pinMode(fluxel, this.MODES.OUTPUT));
      _.each(FLUXELS, fluxel => this.digitalWrite(fluxel, LOW));
    });
  });

  ipcMain.on('turn-off-fluxels', (event, options) => {
    _.each(FLUXELS, (pin) => {
      board.digitalWrite(pin, LOW);
    });
  });

  ipcMain.on('turn-on-fluxel', (event, options) => {
    if (board == undefined) {
      console.log("Board not ready...");
      return;
    }
    const {ids} = options;
    console.log({ids});

    // Turn on fluxels included in options
    let activeFluxels = [];
    _.each(ids, (id) => {
      let fluxel = parseInt(id.split("fluxel")[1]);
      activeFluxels.push(fluxel);
    });

    let inactiveFluxels = _.filter(FLUXELS, (i)=>!_.includes(activeFluxels, i));

    _.each(inactiveFluxels, fluxel => board.digitalWrite(fluxel, LOW));
    _.each(activeFluxels, fluxel => board.digitalWrite(fluxel, HIGH));
  });


  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))
}

app.on('ready', createWindow)
