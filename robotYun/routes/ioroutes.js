
var express = require('express'),
    https = require('https'),
	querystring = require('querystring'),
	body = "",
	returnValue = "",
	accessToken = process.env.SPARKACCESSTOKEN; //process.env.SPARKACCESSTOKEN

var httpsOptions = {
	hostname: 'api.particle.io',
	port: 443,
	path: '/v1/devices/' + process.env.ZEDDEVICE + '/sumocar', //process.env.ZEDDEVICE
	method: 'POST',
	headers: {
		'Accept': '*/*',
		'Accept-Language': 'en-US,en;q=0.8',
		'Accept-Encoding': 'gzip,deflate,sdch',
		'Content-Type': 'application/x-www-form-urlencoded'
	}
};

var leftServo = 0;
var rightServo = 0;
var timerId;
var lastUpdated;

/**
 * This function converts the left and right power settings to values between 0 - 180 for continuous motion servos. 
 */
function convertLRValuesToLRServo(motorObject) {
  var left = 90, right = 90;
  left = (motorObject.L + 100) * 0.9;
  right = 180 - (motorObject.R + 100) * 0.9;
  return {
    "L": left,
    "R": right
  };
}

/**
 * This function sends commands to the api.particle.com cloud service 
 */
function callSparkService(postData) {
	var post_data = postData;
	httpsOptions.headers['Content-Length'] = post_data.length;
	var retValue = "";
	var request = https.request(httpsOptions, function(response) {
		console.log('STATUS: ' + response.statusCode);
		response.setEncoding('utf8');
		response.on('data', function (chunk) {
			retValue += chunk;
		});
		response.on('end', function() {
			console.log('request has ended.');
		});
	});
	
	request.on('error', function(e) {
		console.log('problem with request: ' + e.message);
	});

	// write data to request body
	request.write(post_data);
	request.end();
}

/**
 * This function converts the accelerometer data into Servo motor inputs 
 */
function getServoPower(x, y) {
	if (x > 1000) {
		x = 1000;
	}
	if (x < -1000) {
		x = -1000;
	}
	if (y > 1000) {
		y = 1000;
	}
	if (y < -1000) {
		y = -1000;
	}
  
	var right = y / 10, left = y / 10, diff = 0;
	right -=  (x/10);
	left +=  (x/10); 
  
	if (right > 100) {
		diff = right - 100;
	}
	if (left > 100) {
		diff = left - 100;
	}
	if (right < -100) {
		diff = right + 100;
	}
	if (left < -100)
	{
		diff = left + 100;
	}
	right -= diff;
	left -= diff;
   
	return { "L": left, "R": right };
}

/**
 * This function runs inside a setInterval to rate limit the calls to the particle function 
 */
function particleServiceTimer() {
	var post_data = querystring.stringify({
		'access_token': accessToken,
		'params': leftServo + ',' + rightServo
	});
	callSparkService(post_data);
	console.log('Sending to spark service.');
	if (Date.now() - lastUpdated > 5000) {
		clearInterval(timerId);
		timerId = null;
	}
}

/**
 * Module constructor for the io routes 
 */
module.exports = function(io) {
    var router = express.Router();

    router.get('/test', function (req, res, next) {
      res.render('index', { title: 'Express' });
    });
    
    router.get('/accel/:x/:y/:z', function (req, res, next) {
      var xaxis = req.params.x;
      var yaxis = req.params.y;
      var servoPower = convertLRValuesToLRServo(getServoPower(xaxis, yaxis));
      // Convert L R values to CW and CCW servo values. i.e. -100 = 0, 100 = 180
      console.log(servoPower);
	  leftServo = servoPower.L;
	  rightServo = servoPower.R;
	  lastUpdated = Date.now();
      io.emit('acceldata', { "x": req.params.x, "y": req.params.y, "z": req.params.z });
	  if (!timerId) {
		timerId = setInterval(particleServiceTimer, 1000);	  
	  }
	  
      res.send({ 'Calling Particle Service': true });
    });
    
    return router;
};