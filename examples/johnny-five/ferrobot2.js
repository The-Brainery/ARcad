const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path')
const url = require('url')

const _ = require('lodash');
const five = require('johnny-five');
let board;

const ROWS = [2, 3, 4, 5, 6, 7];
const COLS = [8, 9, 10, 11, 12, 13];

const ROW = 0;
const COL = 1;

const LOW = 0;
const HIGH = 1;


function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600})

  ipcMain.on('start-board', () => {
    board = new five.Board();
    board.on("ready", function() {
      _.each(ROWS, row => this.pinMode(row, this.MODES.OUTPUT));
      _.each(ROWS, row => this.digitalWrite(row, LOW));

      _.each(COLS, col => this.pinMode(col, this.MODES.OUTPUT));
      _.each(COLS, col => this.digitalWrite(col, LOW));
    });
  });

  ipcMain.on('turn-off-fluxels', (event, options) => {

  });

  ipcMain.on('turn-on-fluxel', (event, options) => {
    if (board == undefined) {
      console.log("Board not ready...");
      return;
    }
    const {ids} = options;

    let activeFluxels = _.map(new Array(ROWS.length) , () => new Array(COLS.length));
    console.log({ids});

    _.each(ROWS, (row) => {
      board.digitalWrite(row, LOW);
    });

    _.each(COLS, (col) => {
      board.digitalWrite(col, LOW);
    });

    // Update active fluxel matrix
    _.each(ids, (id) => {
        const row = ROWS[parseInt(id.split("fluxel")[1][ROW])];
        const col = COLS[parseInt(id.split("fluxel")[1][COL])];
        console.log({row, col});
        board.digitalWrite(row, HIGH);
        board.digitalWrite(col, HIGH);
        // activeFluxels[row][col] = true;
    });

    // Turn on fluxels
    // for (let i=0;i<ROWS.length;i++) {
    //   for (let ii=0;ii<COLS.length;ii++) {
    //     console.log("row: ", ROWS[i], "col: ", COLS[ii]);
    //     console.log({LOW, HIGH});
    //     // Turn off inactive fluxels
    //     if (activeFluxels[i][ii] == undefined) {
    //       board.digitalWrite(ROWS[i], LOW);
    //       board.digitalWrite(COLS[ii], LOW);
    //     } else {
    //       console.log("row: ", ROWS[i], "col: ", COLS[ii]);
    //       board.digitalWrite(ROWS[i], HIGH);
    //       board.digitalWrite(COLS[ii], HIGH);
    //     }
    //   }
    // }

  });


  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'ferrobot2.html'),
    protocol: 'file:',
    slashes: true
  }))
}

app.on('ready', createWindow)
