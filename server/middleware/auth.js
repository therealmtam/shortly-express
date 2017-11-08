const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {

  req.session = {};

  if (!req.cookies) {
    //CREATE new session (hash) if the incoming request doesn't have a cookie
    models.Sessions.create()
    .then(insertResponse => {
      return models.Sessions.get({ id: insertResponse.insertId });
    })
    .then(obj => {
      //Set the REQUEST.SESSION.HASH to the newly created hash
      req.session.hash = obj.hash;
      //Set the COOKIES property on the RESPONSE
      res.cookies = {};
      res.cookies['shortlyid'] = {};
      res.cookies['shortlyid'].value = obj.hash;
      res.cookie('shortlyid', obj.hash);
      next();
    })
    .catch(err => {
      console.log('ERROR FOUND ', err.message);
    });
  } else {
    //SET REQUEST.SESSION.HASH to incoming cookie value
    req.session.hash = req.cookies.shortlyid;
    models.Sessions.get({hash: req.session.hash})
    .then(sessionRowData => {
      //If the hash has an associated UserId, append the Username/id to the request
      if (sessionRowData.userId) {
        models.Users.get({id: sessionRowData.userId})
        .then(userRowData => {
          req.session.user = {};
          req.session.user.username = userRowData.username;
          req.session.userId = userRowData.id;
          next();
        });
      } else {
        next();
      }
    })
    .catch(err => {
      //CREATE new session (hash) if the incoming request doesn't have a cookie
      models.Sessions.create()
      .then(insertResponse => {
        return models.Sessions.get({ id: insertResponse.insertId });
      })
      .then(obj => {
        //Set the REQUEST.SESSION.HASH to the newly created hash
        req.session.hash = obj.hash;
        //Set the COOKIES property on the RESPONSE
        res.cookies = {};
        res.cookies['shortlyid'] = {};
        res.cookies['shortlyid'].value = obj.hash;
        res.cookie('shortlyid', obj.hash);
        next();
      })
      .catch(err => {
        console.log('ERROR FOUND ', err.message);
      });
    });
  }
};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/
module.exports.verifySession = (req, res, next) => {

  if (models.Sessions.isLoggedIn(req.session)) {
    next();
  } else {
    res.redirect('/login');
  }
};
