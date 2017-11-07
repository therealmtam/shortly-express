var cookieParser = require('cookie-parser');

const parseCookies = (req, res, next) => {

  //console.log(req.headers);
  // var cook = req.headers.cookie.split('=');

  var parseString = req.headers.cookie;

  req.cookies = {};

  if (parseString) {
    var stringArray = parseString.split(';');
    stringArray.forEach((stringElement) => {
      var cookieArray = stringElement.split('=');
      req.cookies[cookieArray[0].trim()] = cookieArray[1].trim();
    });
  }
  next();
};

module.exports = parseCookies;