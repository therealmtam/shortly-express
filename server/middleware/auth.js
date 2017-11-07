const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {

  req.session = {};

  if (!req.cookies) {
    models.Sessions.create()
    .then(insertResponse => {
      return models.Sessions.get({ id: insertResponse.insertId });
    })
    .then(obj => {
      req.session.hash = obj.hash;
      res.cookies = {};
      res.cookies['shortlyid'] = {};
      res.cookies['shortlyid'].value = obj.hash;
      next();
    })
    .catch(err => {
      console.log('ERROR FOUND ', err.message);
    });
  } else {    
    req.session.hash = req.cookies.shortlyid;
    models.Sessions.get({hash: req.session.hash})
    .then(sessionRowData => {
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
      models.Sessions.create()
      .then(insertResponse => {
        return models.Sessions.get({ id: insertResponse.insertId });
      })
      .then(obj => {
        req.session.hash = obj.hash;
        res.cookies = {};
        res.cookies['shortlyid'] = {};
        res.cookies['shortlyid'].value = obj.hash;
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

