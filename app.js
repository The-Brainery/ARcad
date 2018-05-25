const express = require('express')
const app = express()

app.use(express.static('examples'))
app.use(express.static('build'))

app.listen(3200, () => console.log('Example app listening on port 3200!'))
