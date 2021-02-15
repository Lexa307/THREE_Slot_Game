const path = require("path");

module.exports = {
    mode:"development",
    entry:"./js/main.js",
    output:{
        filename:"main.js",
        path:path.join(__dirname, "out" )
    }
}