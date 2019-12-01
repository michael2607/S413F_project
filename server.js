var express = require('express');
var session = require('cookie-session');
var bodyParser = require('body-parser');
var url = require('url');
var app = express();
app.set('view engine', 'ejs');
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var assert = require ('assert');
var ObjectID = require('mongodb').ObjectID;
var formidable = require("formidable");
var urlencodedParser = bodyParser.urlencoded({extended:false});
var mongourl = 'mongodb://user:user@381f-shard-00-00-8efgx.mongodb.net:27017,381f-shard-00-01-8efgx.mongodb.net:27017,381f-shard-00-02-8efgx.mongodb.net:27017/test?ssl=true&replicaSet=381f-shard-0&authSource=admin&retryWrites=true&w=majority';
var bs = '<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css" integrity="sha384-MCw98/SFnGE8fJT3GXwEOngsV7Zt27NXFoaoApmYm81iuXoPkFOJwJ8ERdknLPMO" crossorigin="anonymous">';


function findRestaurants(db,callback) {
  var restaurants = [];
  traget = db.collection('newrestaurant').find();
  traget.each(function(err, doc) {
    assert.equal(err, null);
    if (doc != null) {
      restaurants.push(doc);
    } else {
      callback(restaurants);
    }
  });
}

function insertRestaurant(db,restaurant_Array,callback) {
  db.collection('newrestaurant').insertOne(restaurant_Array,function(err,result) {
    assert.equal(err,null);
    callback(result);
  });
}

function updateRestaurant(db, doc, restaurant_Array, callback) {
  db.collection('newrestaurant').updateOne(doc, {$set:restaurant_Array}, function(err,result) {
    assert.equal(err,null);
    callback(result);
  });
}

function findRated(db,user,callback) {
	db.collection("newrestaurant").findOne(user, function(err, result){
		assert.equal(err,null);		
		callback(result);
	});
}

function findLargestRestID(db,callback) {
	db.collection("newrestaurant").find().sort({restaurant_id:-1}).toArray(function(err, result) {
		assert.equal(err,null);
		callback(result);
	});
}

function insertUser(db,userArray,callback) {
  db.collection('user-data').insertOne(userArray,function(err,result) {
    assert.equal(err,null);
    callback(result);
  });
}

function searchRestaurant(db, restaurant_Array, callback){
	db.collection("newrestaurant").find(restaurant_Array).toArray(function(err, result){
		assert.equal(err,null);				
		callback(result);		
	});
}



//----------------------------------Login-In-----------------------------------//

var SECRETKEY1 = 'key 1';
var SECRETKEY2 = 'key 2';

app.set('view engine','ejs');

app.use(session({
  name: 'session',
  keys: [SECRETKEY1,SECRETKEY2]
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/login',function(req,res) {
	res.sendFile(__dirname + '/public/login.html');
});

app.get('/adduser',function(req,res) {
	res.status(200);
	res.render('adduser', {bs:bs});	
});

app.get('/',function(req,res) {
	if (!req.session.authenticated) {
		res.redirect('/login');
	} else {
		MongoClient.connect(mongourl, function(err, db) {
			assert.equal(err,null);
			console.log('Connected to MongoDB\n');
			findRestaurants(db,function(restaurants) {
				db.close();			
				res.render('index',{name:req.session.username,data:restaurants, bs:bs});
				return(restaurants);
			});
		});		
	}
});

app.get('/search',urlencodedParser,function(req,res) {
	
	var parsedURL = url.parse(req.url,true);
  	var query_Object = parsedURL.query;
	
	if(query_Object.opt !=null && query_Object.keywords !=null
	&& query_Object.opt !="" && query_Object.keywords !=""){			
		var keyword = query_Object.keywords;
		var opt = query_Object.opt;		
		var search_array = {};
		search_array[opt] = new RegExp(keyword);
		
		MongoClient.connect(mongourl, function(err, db) {
			try {
				assert.equal(err,null);
			} catch (err) {
				res.set({"Content-Type":"text/plain"});
				res.status(500).end("connection failed!");
			}
			
			searchRestaurant(db, search_array, function(result){
				db.close(); 
				res.status(200);
				res.render('search',{
					bs:bs,
					keyword:keyword,
					opt:opt,
					result:result
				});			
			});		
		});	
		
	}else{
		res.status(200);
		res.render('search',{
			bs:bs,
			keyword:null,
			opt:null,
			result:null
		});		
	}	
});

app.post('/login',urlencodedParser,function(req,res) {
	MongoClient.connect(mongourl, function(err, db) {
		try {
      assert.equal(err,null);
    } catch (err) {
      res.set({"Content-Type":"text/plain"});
      res.status(500).end("connection failed!");
    }
		db.collection('user-data').findOne({username:req.body.name}, function(err, user) {
				console.log(user);
				if(user ===null){
					res.set({"Content-Type":"text/html"});
					res.end(bs+"<title>Error</title><h1>User is not exist.</h1><a href='login'>Go Back</a>");
				}else if (user.username === req.body.name && user.password === req.body.password){
					req.session.authenticated = true;
					req.session.username = user.username;
					res.redirect('/');
				} else {	
					 res.set({"Content-Type":"text/html"});
					 res.status(404).end(bs+"<title>Error</title><h1>Error   Occur.</h1><a href='login'>Go Back</a>");
				}
		});
	});
});

app.get('/logout',function(req,res) {
	req.session = null;
	res.redirect('/');
});

app.get('/display',urlencodedParser,function(req,res) {

    var parsedURL = url.parse(req.url,true);
  	var query_Object = parsedURL.query;

  if (query_Object._id.length === 24) {
		var doc = {};			  
		doc['_id'] = ObjectID(query_Object._id);		
		MongoClient.connect(mongourl, function(err, db) {
		  try {
			assert.equal(err,null);
		  } catch (err) {
			res.set({"Content-Type":"text/plain"});
			res.status(500).end("connection failed!");
		  }
		  db.collection('newrestaurant').findOne(doc, function(err, result) {			
			db.close();				
			if(result.mimetype==null && result.photo==null){				
				var showphoto = false;
			}else{
				var showphoto = true;
			}
			
			if(result.address.coord[0]==null && result.address.coord[1]==null){				
				var havemap = false;
			}else{
				var havemap = true;
			}				
			
			var grades = result.grades;
			
			if(grades==null){				
				var haverate = false;
				grades = "";
			}else{
				var haverate = true;
			}		
			
			res.status(200);
			res.render('display', {
				_id:result._id,
				name:result.name, 
				borough:result.borough, 
				cuisine:result.cuisine, 
				street:result.address.street, 
				building:result.address.building,
				zipcode:result.address.zipcode,
				lon:result.address.coord[0],
				lat:result.address.coord[1],
				owner:result.owner,
				grades:grades,				
				mimetype:result.mimetype, 
				photo:result.photo,
				showphoto:showphoto,
				havemap:havemap,
				haverate:haverate,
				bs:bs
			});
		  });
		});
  }else{
		res.set({"Content-Type":"text/html"});
		res.status(404).end(bs+"<title>Error</title><h1>Invalid ID.</h1><a href='/'>Go Back</a>");
  }
});


//-------------------------------Add User-------------------------------//

app.get('/new', function(req, res){
	res.status(200);
	res.render('new',{bs:bs});
});

app.post('/adduser', function(req, res){
    MongoClient.connect(mongourl, function(err,db) {
    try {
      assert.equal(err,null);
      console.log('connection successful.')
    } catch (err) {
      res.set({"Content-Type":"text/plain"});
      res.status(500).end("connection failed!");
    }
  var form = new formidable.IncomingForm();
    form.parse(req, function (err, form_field, value){
      if (form_field.username) {
        var username = form_field.username;
      }
      
        var password = form_field.password;
      
      if (form_field.email) {
        var email = form_field.email;
      }

        var user_array = {};
        user_array['username'] = username;
        user_array['password'] = password;
        user_array['email'] = email;
 
        insertUser(db, user_array, function(result){
          db.close();       
        });      
      });
      res.redirect('/');
    });
  });

app.get('/change', function(req, res){
  
	var parsedURL = url.parse(req.url,true);
	var query_Object = parsedURL.query;
	
	if (query_Object._id.length === 24) {
		res.status(200);
		var doc = {};
		doc['_id'] = ObjectID(query_Object._id);		
		MongoClient.connect(mongourl, function(err, db) {
			try {
				assert.equal(err,null);
			} catch (err) {
				res.set({"Content-Type":"text/plain"});
				res.status(500).end("connection failed!");
			}
			db.collection('newrestaurant').findOne(doc, function(err, result) {			
				db.close();						
				
				if(result.owner===req.session.username){	
					console.log("You are owner");
					res.render('change',{
						bs:bs,
						name:result.name,
						_id:query_Object._id,
						borough:result.borough, 
						cuisine:result.cuisine, 
						street:result.address.street, 
						building:result.address.building,
						zipcode:result.address.zipcode,
						lon:result.address.coord[0],
						lat:result.address.coord[1]
					});
				}else{
					console.log("You are not owner");
					res.set({"Content-Type":"text/html"});
					res.status(404).end(bs+
					"<title>Error</title><h1>You are not authorized to edit.</h1><a href='display?_id="+query_Object._id+"'>Go Back</a>");
				}								
			});
		});		
	}else{
		res.set({"Content-Type":"text/html"});
		res.status(404).end(bs+"<title>Error</title><h1>Invalid ID.</h1><a href='/'>Go Back</a>");
	}

});

app.post('/change', function(req, res){
if(req.session.authenticated == true){
	var form = new formidable.IncomingForm();
	form.parse(req, function (err, form_field, files){		

		var doc = {};
		doc['_id'] = ObjectID(form_field._id);	
		
		  var filename = files.filetoupload.path;

		  if (files.filetoupload.type) {
			  var mimetype = files.filetoupload.type;			  
		  }

					  

		  if (form_field.name) {
			var name = form_field.name;
		  }

		  if (form_field.borough) {
			var borough = form_field.borough;
		  }

		  if (form_field.cuisine) {
			var cuisine = form_field.cuisine;
		  }

		  if (form_field.street) {
			var street = form_field.street;
		  }

		  if (form_field.building) {
			var building = form_field.building;
		  }

		  if (form_field.zipcode) {
			var zipcode = form_field.zipcode;
		  }

		  if (form_field.lon && form_field.lat) {
			  var lon = form_field.lon;
			  var lat = form_field.lat;			  
		  }	
		  	  
		fs.readFile(filename, function(err,data) {
			MongoClient.connect(mongourl, function(err,db) {
			try {
			  assert.equal(err,null);
			  console.log('connection successful.')
			} catch (err) {
			  res.set({"Content-Type":"text/plain"});
			  res.status(500).end("connection failed!");
			}			

			var update_array = {};			
			update_array['name'] = name;
			update_array['borough'] = borough;
			update_array['cuisine'] = cuisine;
			update_array['address'] = {'street':street, 'building':building, 'zipcode':zipcode, 'coord':[lon, lat]};					
			update_array['mimetype'] = mimetype;
			update_array['photo'] = new Buffer(data).toString('base64');
						
			
			updateRestaurant(db, doc, update_array, function(result){
				db.close();
				res.redirect('/display?_id=' + form_field._id);
		    });		   
		  });
	  });
   });
}else{
	res.redirect('/login');
}	
});






app.get('/rate', function(req, res){
	var parsedURL = url.parse(req.url,true);
	var query_Object = parsedURL.query;
	if (query_Object._id.length === 24) {
		console.log(query_Object._id);
		res.status(200);
		res.render('rate',{name:query_Object.name, _id:query_Object._id, bs:bs});
	}else{
		res.set({"Content-Type":"text/html"});
		res.status(404).end(bs+"<title>Error</title><h1>Invalid ID.</h1><a href='/'>Go Back</a>");
	}
});




app.post('/rate', function(req, res){  
  var query = {};
  query['_id'] = ObjectID(req.body._id);

  var newrate = {$push: {grades: { score:req.body.score, user:req.session.username} }} ;
  var user_array = {};
  user_array['_id'] = ObjectID(req.body._id);
  user_array['grades.user'] = req.session.username;  

  MongoClient.connect(mongourl, function(err,db) {
    findRated(db,user_array,function(result){
      if(result!=null){
		 res.set({"Content-Type":"text/html"});		
         	 res.status(404).end(bs+"<title>Error</title><h1>Restaurant had been rated already.</h1><a href='display?_id="+req.body._id+"'>Go Back</a>");
      }else{
		db.collection("newrestaurant").updateOne(query, newrate, function(err, res) {
    			if (err) throw err;
    			console.log("Rate added");
    			db.close();
       		 });
        	res.redirect('/display?_id=' + req.body._id);
	}
     });     
  });
});

app.post('/create', function(req, res){
	var form = new formidable.IncomingForm();
	form.parse(req, function (err, form_field, files){		 
		  if (form_field.name) {
			var name = form_field.name;
		  }
		  if (form_field.borough) {
			var borough = form_field.borough;
		  }
		  if (form_field.cuisine) {
			var cuisine = form_field.cuisine;
		  }
		  if (form_field.street) {
			var street = form_field.street;
		  }
		  if (form_field.building) {
			var building = form_field.building;
		  }
		  if (form_field.zipcode) {
			var zipcode = form_field.zipcode;
		  }
		  if (form_field.lon && form_field.lat) {
			  var lon = form_field.lon;
			  var lat = form_field.lat;
			  var havemap = true;
		  }else{			  
			  var havemap = false;
		  }	

		  var filename = files.filetoupload.path;

		  if (files.filetoupload.type) {
			  var mimetype = files.filetoupload.type;			  
		  }
				  

		  if(files.filetoupload.size > 0 && mimetype=="image/jpeg"){
			  var showphoto = true;			  
		  }else{
			  var showphoto = false;			  
		  }

		  var owner = req.session.username;
	  
		fs.readFile(filename, function(err,data) {
			MongoClient.connect(mongourl, function(err,db) {
			try {
			  assert.equal(err,null);
			  console.log('connection successful.')
			} catch (err) {
			  res.set({"Content-Type":"text/plain"});
			  res.status(500).end("connection failed!");
			}

			findLargestRestID(db, function(result){
				if(result == ''){
					var restid = 1;
				}else{
					var restid = result[0].restaurant_id + 1;
				}
				console.log("restid " + restid + " inserted");

			var restaurant_array = {};
			restaurant_array['restaurant_id'] = restid;
			restaurant_array['name'] = name;
			restaurant_array['borough'] = borough;
			restaurant_array['cuisine'] = cuisine;
			restaurant_array['address'] = {'street':street, 'building':building, 'zipcode':zipcode, 'coord':[lon, lat]};
			restaurant_array['owner'] = owner;

			if (files.filetoupload.size > 0 && mimetype=="image/jpeg"){
				restaurant_array['mimetype'] = mimetype;
				restaurant_array['photo'] = new Buffer(data).toString('base64');
			}else{
				console.log("not jpg");
			}

			insertRestaurant(db, restaurant_array, function(result){
			  db.close();			  
			  var cid = result.ops;
			  var _id = cid[0]._id;

			  res.render('create',{
				  name:name, 
				  borough:borough, 
				  owner:owner, 
				  cuisine:cuisine, 
				  street:street, 
				  building:building, 
				  zipcode:zipcode, 
				  lon:lon, 
				  lat:lat,				   
				  photo:restaurant_array['photo'], 
				  mimetype:mimetype, 
				  restid:restid, 
				  _id:_id, 
				  bs:bs, 
				  showphoto:showphoto,
				  havemap:havemap
			  });
		    });
		   });
		 });
	  });
   });
});

app.use(express.static(__dirname +  '/public'));

app.get("/gmap", urlencodedParser, function(req,res) {
    var parsedURL = url.parse(req.url,true);
  	var query_Object = parsedURL.query;	
	
	if (query_Object.lat != "" && query_Object.lon != "" && query_Object.name != "") {
		res.status(200);
		res.render('gmap', {lat:query_Object.lat, lon:query_Object.lon, name:query_Object.name, bs:bs});
	}else{			
		res.set({"Content-Type":"text/html"});
		res.status(404).end(bs+"<title>Error</title><h1>Name or lat or lon is missing.</h1><a href='/'>Go Back</a>");		
	}
});

app.get('/delete', function(req, res){
	var parsedURL = url.parse(req.url,true);
	var query_Object = parsedURL.query;

	if (query_Object._id.length === 24) {
		res.status(200);
		var doc = {};
		doc['_id'] = ObjectID(query_Object._id);
		MongoClient.connect(mongourl, function(err, db) {
			try {
				assert.equal(err,null);
			} catch (err) {
				res.set({"Content-Type":"text/plain"});
				res.status(500).end("connection failed!");
			}
			db.collection('newrestaurant').findOne(doc, function(err, result) {
				//db.close();
        console.log(result);
				if(result.owner===req.session.username){

					console.log("You are owner");
          console.log(result.name);

          db.collection('newrestaurant').deleteOne(doc, function(err, result) {
            if(err) throw err;

            console.log(result +"was deleted");
            });
			res.redirect('/');
				}else{
					console.log("You are not owner");
					res.set({"Content-Type":"text/html"});
					res.status(404).end(bs+
					"<title>Error</title><h1>You are not authorized to delete.</h1><a href='display?_id="+query_Object._id+"'>Go Back</a>");
				}
			});
		});
	}else{
		res.set({"Content-Type":"text/html"});
		res.status(404).end(bs+"<title>Error</title><h1>Invalid .</h1><a href='/'>Go Back</a>");
	}
});


//-----------------------RESTFUL----------------------//


app.get('/api/restaurant/name/:restname',function(req,res){
var request = {};
  request['name'] = req.params.restname;
  MongoClient.connect(mongourl, function(err, db) {
    try {
    assert.equal(err,null);
    } catch (err) {
    res.set({"Content-Type":"text/plain"});
    res.status(500).end("connection failed!");
    }
    db.collection('newrestaurant').findOne(request, function(err, result) {
    if(result == null){
      res.status(404).json({}).end();
    }else {
      console.log(result);
      var ans ={};
      ans.name = result.name;
      res.status(200).json(result).end();
         }
       });
    });
});

app.get('/api/restaurant/borough/:bo',function(req,res){
  var request = {};
    request['borough'] = req.params.bo;
    MongoClient.connect(mongourl, function(err, db) {
      try {
      assert.equal(err,null);
      } catch (err) {
      res.set({"Content-Type":"text/plain"});
      res.status(500).end("connection failed!");
      }
      db.collection('newrestaurant').find(request).toArray(function(err, result) {
      if(result == null){
        res.status(404).json({}).end();
      }else {
        console.log(result);
        var ans ={};
        ans.borough = result.borough;
        res.status(200).json(result).end();
           }
         });
      });
});

app.get('/api/restaurant/cuisine/:cu',function(req,res){
    var request = {};
      request['cuisine'] = req.params.cu;
      MongoClient.connect(mongourl, function(err, db) {
        try {
        assert.equal(err,null);
        } catch (err) {
        res.set({"Content-Type":"text/plain"});
        res.status(500).end("connection failed!");
        }
        db.collection('newrestaurant').findOne(request, function(err, result) {
        if(result == null){
          res.status(404).json({}).end();
        }else {
          console.log(result);
          var ans ={};
          ans.cuisine = result.cuisine;
          res.status(200).json(ans).end();
             }
           });
        });
});

app.post('/api/restaurant/',function(req,res){      
	   MongoClient.connect(mongourl, function(err, db) {
          try {
			assert.equal(err,null);
          } catch (err) {
			res.set({"Content-Type":"text/plain"});
			res.status(500).end("connection failed!");
          }
		  
	  findLargestRestID(db, function(result){
		if(result == ''){
		  var restid = 1;
		}else{
		  var restid = result[0].restaurant_id + 1;
		}
		console.log("restid " + restid + " inserted");

	  var restaurant_array = {};
	
	  restaurant_array['restaurant_id'] = restid;
	  restaurant_array['name'] = req.body.name;
	  restaurant_array['borough'] = req.body.borough;
	  restaurant_array['cuisine'] = req.body.cu;
	  restaurant_array['address'] = {'street':req.body.street, 'building':req.body.building, 'zipcode':req.body.zipcode, 'coord':[req.body.lon, req.body.lat]};
	  restaurant_array['owner'] = req.body.owner;
	  	  

            insertRestaurant(db,restaurant_array, function(result){
				db.close();

				if(result == null){
					res.status(404).json({status: failed}).end();
				}else {
					var cid = result.ops;
					var _id = cid[0]._id;
					
					var ans ={};
					ans.status = "ok";
					ans._id = _id;
					
					res.status(200).json(ans).end();
				}
            });
        });
    });
});




app.get('*', function(req,res) {
  res.status(404).end('File not found');
});

app.listen(process.env.PORT || 8099);

