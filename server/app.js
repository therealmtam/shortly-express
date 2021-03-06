const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const cookieParser = require('./middleware/cookieParser');
const models = require('./models');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser);
app.use(Auth.createSession);

app.get('/', Auth.verifySession,
(req, res) => {
  res.render('index');
});

app.get('/create', Auth.verifySession,
(req, res) => {
  res.render('index');
});

app.get('/links', Auth.verifySession,
(req, res, next) => {
  models.Links.getAll()
    .then(links => {
      res.status(200).send(links);
    })
    .error(error => {
      res.status(500).send(error);
    });
});

app.post('/links', Auth.verifySession,
(req, res, next) => {
  var url = req.body.url;
  if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
    return res.sendStatus(404);
  }

  return models.Links.get({ url })
    .then(link => {
      if (link) {
        throw link;
      }
      return models.Links.getUrlTitle(url);
    })
    .then(title => {
      return models.Links.create({
        url: url,
        title: title,
        baseUrl: req.headers.origin
      });
    })
    .then(results => {
      return models.Links.get({ id: results.insertId });
    })
    .then(link => {
      throw link;
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(link => {
      res.status(200).send(link);
    });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

//Handle signup
app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', (req, res, next) => {
  models.Users.create(req.body)
  .then(function(data) {
    currentUserId = data.insertId;
    var currentHash = req.session.hash;
    models.Sessions.update({hash: currentHash}, {userId: currentUserId}).
    then((data) => {
      res.redirect('/');
    })
    .catch(err => {
      console.log('FOUND AN ERROR');
    });
  })
  .catch(err => {
    if (err.code === 'ER_DUP_ENTRY') {
      res.redirect('/signup');
    }
  });
});

//Handle login
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;

  models.Users.get({username: username})
  .then(result => {
    var isCorrectPw = models.Users.compare(password, result.password, result.salt);
    if (isCorrectPw) {
      console.log('REQ.SESSION ', req.session);
      req.session.user = { username: result.username };
      currentUserId = req.session.userid = result.id;
      models.Sessions.update({hash: req.session.hash}, {userId: currentUserId}).
      then((data) => {
        res.redirect(302, '/');
      })
      .catch(err => {
        console.log('FOUND AN ERROR');
      });
    } else {
      res.redirect('/login');
    }
  })
  .catch(err => {
    if (err.message === 'Cannot read property \'password\' of undefined') {
      res.redirect('/login');
    }
  });
});

//Handle logout
app.get('/logout', (req, res, next) => {
  //delete session from sessions table
  //add res.clear on the response
  var currentHash = req.session.hash;
  console.log('IN LOGOUT ROUTE');
  models.Sessions.delete({hash: currentHash})
  .then(data => {
    res.clearCookie('shortlyid');
    next();
  })
  .catch(err => {
    console.log('ERROR ', err);
  });

});


/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
