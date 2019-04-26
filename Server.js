const http = require('http');
const Response = require('./Response');
const pg = require('pg');

const READ = 1;
const WRITE = 2;
const UPDATE = 4;
const DELETE = 8;

/*
 * Currently runs with any request type. Alter if you wish for GET/POST/PUT/DELETE 
 */

function RESTdbServer(initialPermissions){
    this.permissions = initialPermissions;
    
    function getQuery(request){
	var url = require('url');
	var parts = url.parse(request.url, true);
	return parts.query;
    }

    function validate(query, responseObject){
	var perms = this.permissions[query.key];
	if(typeof perms == 'undefined'){
	    responseObject.errmsg = "Invalid key.";
	    responseObject.errcode = 1;
	    return false;
	}

	if(typeof query.query == 'undefined'){
	    responseObject.errmsg = "Undefined query.";
	    responseObject.errcode = 3;
	    return false;
	}

	var qry = query.query.toLowerCase();
	var names = ['select', 'insert', 'update', 'delete'];
	var inqry = [];
	for(var i = 0; i < names.length; i++)
	    inqry.push(qry.indexOf(names[i]) != -1);

	for(var i = 0; i < inqry.length; i++){
	    if(inqry[i]){
		if(!(perms & 1 << i)){
		    responseObject.errmsg = "Insufficiant permissions.";
		    responseObject.errcode = 2;
		    return false;
		}
	    }
	}

	if(qry.indexOf('load') != -1 || qry.indexOf('into') != -1){
	    if(!(perms & WRITE)){
		responseObject.errmsg = "Insufficiant permissions.";
		responseObject.errcode = 2;
		return false;
	    }
	}

	var names = ['create', 'drop', 'desc', 'show', 'set', 'alter'];
	for(var i = 0; i < names.length; i++){
	    if(qry.indexOf(names[i]) != -1){
		responseObject.errmsg = "Invalid query.";
		responseObject.errcode = 4;
		return false;
	    }
	}

	return true;
    }
    
    function sendResponse(response, request, query, responseObject){
	if(!validate(query, responseObject)) return;

	const client = new pg.Client({
	    user: 'restdb',
	    host: 'localhost',
	    database: 'restdb',
	    password: 'PASSWORD',
	    port: 5432
	});
	client.connect();

	var couldNotConnect = function(){
	    responseObject.errmsg = "Could not connect to database.";
	    responseObject.errcode = 5;
	    response.end(JSON.stringify(responseObject));
	};

	try{
	    const res = client.query(query.query).then(
		function(res, err){
		    responseObject.result = res.rows;
		    response.end(JSON.stringify(responseObject));
		}
	    ).catch(couldNotConnect);
	}catch(e){
	    couldNotConnect();
	}
    }
    
    this.start = function(port){
	http.createServer(function (request, response) {
	    var responseObject = new Response();
	    response.writeHead(200, {'Content-Type': 'application/json'});
	    var query = getQuery(request);
	    var key = query.key;
	    if(typeof key == 'undefined'){
		responseObject.errmsg = "Undefined key.";
		responseObject.errcode = 0;
		response.end(JSON.stringify(responseObject));
		return;
	    }
	    
	    sendResponse(response, request, query, responseObject);
	}).listen(port);
    }
}
