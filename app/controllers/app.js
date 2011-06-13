var app    = require('express').createServer()
  , Step   = require(global.settings.app_root + '/lib/step')
  , oAuth  = require(global.settings.app_root + '/app/models/oauth')
  , PSQL   = require(global.settings.app_root + '/app/models/psql')  
  , _      = require('underscore');
  _.mixin(require('underscore.string'));


// CartoDB v1 SQL API
//
// all requests expect the following URL args:
// - `sql` {String} SQL to execute
//
// for private (read/write) queries:
// - `auth_token` {String} oAuth API token from CartoDB. In URL or request header.
//
// eg. /v1/?sql=SELECT 1 as one&auth_token=my_token
//
// for public (read only) queries:
// - `database` {String} The database to execute queries on
//
// eg. /v1/?sql=SELECT 1 as one&database=my_public_db
//
// NOTE: private queries can only be ran on databases the oAuth key gives access to. 
app.get('/v1/', function(req, res){
  
  //sanitize input
  var sql       = _.trim(req.query.sql);
  var database  = _.trim(req.query.database); // needed if the user fails the auth to specify public access
  sql      = (sql == "")      ? null : sql;
  database = (database == "") ? null : database;
  
  try {
    if (!_.isString(sql)) throw new Error("You must indicate a sql query");
    var pg;
    
    Step(
      function getUser() {
        oAuth.authorize(req, this);
      },
      function querySql(err, user_id){
        if (err) throw err;
        pg = new PSQL(user_id, database);
        pg.query(sql, this);
      },
      function packageResults(err, result){
        if (err) throw err;
        pg.end();
        res.send(result.rows);
      },
      function exceptionHandle(err, result){
        res.send({error:[err.message]}, 400);
      }
    );  
  } catch (err) {
    res.send({error:[err.message]}, 400);
  }  
});

app.listen(global.settings.node_port);
//module.exports = app;