var _      = require('underscore')
  , pg     = require('pg').native;
  _.mixin(require('underscore.string'));  

// PSQL
//
// A simple postgres wrapper with logic about username and database to connect
//
// * intended for use with pg_bouncer
// * defaults to connecting with a "READ ONLY" user to given DB if not passed a specific user_id
var PSQL = function(user_id, db){  
  if (!_.isString(user_id) && !_.isString(db)) throw new Error("database user or name must be specified") 

  var me = {
      public_user: "publicuser"
    , user_id: user_id
    , db: db
    , client: null
  };      
  
  me.username = function(){
    var username = this.public_user;    
    if (_.isString(this.user_id)) 
      username = _.template(global.settings.db_user, {user_id: this.user_id});
    
    return username; 
  }
  
  me.database = function(){      
    var database = db;    
    if (_.isString(this.user_id))
      database = _.template(global.settings.db_base_name, {user_id: this.user_id});
          
    return database;
  }
  
  // memoizes connection in object. move to proper pool.
  me.connect = function(callback){
    var that = this
    var conString = "tcp://" + this.username() + "@" + global.settings.db_host + "/" + this.database();
    if (that.client) {
      return callback(null, that.client);
    } else {
      pg.connect(conString, function(err, client){
        that.client = client;
        return callback(err, client);        
      });      
    }
  }
    
  me.query = function(sql, callback){
    this.connect(function(err, client){      
      if (err) return callback(err, null);      
      client.query(sql, function(err, result){
        return callback(err, result)
      });
    });
  };  
  
  me.end = function(){
    if (this.client) this.client.end();
  }
  
  return me;
};

module.exports = PSQL;  